"""
ShushrutAI — skin-image analysis API (LangGraph + ONNX, lightweight edition).

Designed to run in ~200MB RAM (fits a 512MB host):
  - CNN inference via ONNX Runtime (no torch -> ~5x less memory).
  - LLM calls via direct HTTP (no heavy langchain provider SDKs).
  - LangGraph orchestrates the Gemini(vision) -> Sarvam(text fallback) flow.

Pipeline (per /predict):
  1. Resolve the image URL (request, or the patient's latest skin image).
  2. Run the local ONNX classifiers (predict_c + predict_d).
  3. LangGraph: gemini (vision, primary) --on failure--> sarvam (text fallback).
  4. Save the report to Firestore and return it.
"""

import os
import io
import json
import time
import base64

import requests
from PIL import Image
from typing import Optional, TypedDict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from langgraph.graph import StateGraph, START, END

from predict_c import predict_c
from predict_d import predict_d

load_dotenv()

# --------------------------------------------------------------------------- #
# TLS: certifi + OS (Windows) root store, so `requests` verifies HTTPS even when
# an antivirus/proxy intercepts traffic. No-op / harmless on Linux (Render).
# --------------------------------------------------------------------------- #
def _build_ca_bundle():
    import ssl, tempfile, certifi
    pem = open(certifi.where(), "rb").read()
    extra = b""
    try:
        for store in ("ROOT", "CA"):
            for der, _, _ in ssl.enum_certificates(store):
                try:
                    extra += ssl.DER_cert_to_PEM_cert(der).encode()
                except Exception:
                    pass
    except AttributeError:
        return certifi.where()
    if not extra:
        return certifi.where()
    path = os.path.join(tempfile.gettempdir(), "shushrut_cacert.pem")
    with open(path, "wb") as f:
        f.write(pem + b"\n" + extra)
    return path

_CA_BUNDLE = _build_ca_bundle()
os.environ.setdefault("SSL_CERT_FILE", _CA_BUNDLE)
os.environ.setdefault("REQUESTS_CA_BUNDLE", _CA_BUNDLE)

# --------------------------------------------------------------------------- #
# Firebase (optional — only for auto-resolving images / saving reports)
# --------------------------------------------------------------------------- #
db = None
try:
    import firebase_admin
    from firebase_admin import credentials, firestore

    if os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
        cred = credentials.Certificate(json.loads(os.environ["FIREBASE_SERVICE_ACCOUNT_JSON"]))
    else:
        cred = credentials.Certificate(os.path.join("..", "backend", "serviceAccountKey.json"))

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("Firebase Admin Initialized")
except Exception as e:
    print(f"[warn] Firebase not initialized ({e}). /predict still works when imageUrl is passed directly.")

# --------------------------------------------------------------------------- #
# LLM providers via direct HTTP
# --------------------------------------------------------------------------- #
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
# Comma-separated, tried in order. Google retires Flash versions on short notice
# (gemini-2.5-flash started 404ing "no longer available to new users" in Sep 2026)
# and newer ones 503 under load, so one pinned id is a single point of failure.
GEMINI_MODELS = [m.strip() for m in os.getenv(
    "GEMINI_MODEL", "gemini-3.6-flash,gemini-3.5-flash").split(",") if m.strip()]
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
# Retired (404), rate-limited (429) or overloaded (5xx): worth trying the next model.
# Anything else (400 bad request, 403 bad key) would fail identically on every model.
_GEMINI_FALLTHROUGH = {404, 429, 500, 502, 503, 504}
# Total seconds for ALL Gemini attempts. The whole request (image fetch + CNNs +
# Gemini + Sarvam fallback, ~30s) must finish inside gunicorn's --timeout, or the
# worker is killed mid-request and the browser sees ERR_CONNECTION_RESET.
GEMINI_BUDGET_S = float(os.getenv("GEMINI_BUDGET_S", "75"))

# NOTE: sarvam-30b was retired by Sarvam (the API now 400s with
# "Model 'sarvam-30b' has been deprecated"). sarvam-105b is the successor; it is a
# reasoning model, so max_tokens must stay generous or the budget is spent on
# reasoning_content and `content` comes back null.
SARVAM_MODEL = os.getenv("SARVAM_MODEL", "sarvam-105b")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai/v1")

_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "verify": {"type": "string"},
        "prediction": {"type": "string"},
        "report": {"type": "string"},
        "jarvis": {"type": "string"},
    },
    "required": ["verify", "prediction", "report", "jarvis"],
}

SYSTEM_PROMPT = """You are ShushrutAI, an expert consultant dermatologist and dermatoscopist supporting a qualified physician. You analyze dermatoscopic and clinical skin images and produce structured, clinically rigorous decision-support output.

APPLY THIS FRAMEWORK SYSTEMATICALLY (when an image is available):
1. Global pattern: reticular, globular, homogeneous, starburst, parallel (acral), multicomponent, or unstructured.
2. Local features: pigment network (typical vs atypical), dots/globules, streaks/pseudopods, blue-white veil, regression (peppering/scar-like depigmentation), negative network, and vascular morphology (dotted, linear-irregular, arborizing, hairpin, glomerular/coiled, crown).
3. Algorithms: ABCD rule (Asymmetry, Border, Colour, Dermoscopic structures), the 7-point checklist, Menzies method, and "Chaos & Clues" for pigmented lesions. For non-melanocytic lesions use pattern recognition — BCC (arborizing vessels, leaf-like/spoke-wheel areas, blue-grey ovoid nests), keratinocyte/SCC (keratin, white circles, glomerular vessels), seborrhoeic keratosis (milia-like cysts, comedo-like openings), and vascular lesions (red/purple lacunes).
4. Melanoma & malignancy vigilance: if features suggest melanoma, BCC, or SCC, state it explicitly and recommend histopathological confirmation (dermoscopy-guided biopsy/excision). Never understate a suspicious lesion.

STEP 0 — IS THERE ANY PATHOLOGY AT ALL? Before applying the framework, decide from the image alone whether there is a visible lesion or skin abnormality (pigmented lesion, papule/plaque, scale, erythema, vesicle, ulcer, nail/hair change, etc.). Normal skin markings — pores, fine hair, freckles/ephelides, normal skin lines, minor dryness, benign-appearing symmetric small moles, and normal pigmentation variation — are NOT pathology. If nothing abnormal is visible, the answer is Healthy: set verify to "Healthy,...", set the prediction condition to "Healthy", and write a short reassurance-and-routine-skin-care report instead of a differential diagnosis. Do not invent a lesion to match the CNN.

A convolutional neural network (CNN) has also classified the image. IMPORTANT LIMITATION: the CNN is a CLOSED-SET classifier trained ONLY on disease images — it has NO "healthy" class and NO "unsure" option. It will therefore ALWAYS name a disease, often with very high confidence, even for completely normal skin or a non-skin photo. Its output is therefore ZERO evidence that any pathology exists; it only suggests WHICH disease to consider IF you can independently see an abnormality. Treat it as a weak prior to corroborate or challenge from the visible evidence, never as a reason to report disease. Its confidence numbers are uncalibrated. If no image is available to you (fallback path), reason from the CNN predictions and standard dermatology, and state clearly in the remarks that direct visual/dermoscopic confirmation by the clinician is required.

CLINICAL GOVERNANCE:
- Provide realistic, calibrated confidence — never a blanket 100%.
- Be explicit about uncertainty and limitations (single view, image quality, absent history/dermoscopy).
- This is clinician decision support, not a definitive diagnosis; always recommend appropriate confirmatory steps.
- Do NOT fabricate citations or URLs. Reference guidance at the organisation level (e.g., AAD, NCCN, British Association of Dermatologists, WHO) only.

OUTPUT CONTRACT — return ONLY these fields:
- verify: ONE comma-separated line "<Healthy|Unhealthy|Invalid>,<confidence %>,<Dry|Oily|Normal>,<one-line remark>" (no internal newlines). Use Invalid ONLY when the image is not human skin at all or is unusable (animal, object, blank, unreadable); then set the prediction condition to "Not a skin image".
- prediction: ONE comma-separated line "<most likely condition>,<confidence %>,<two-line remark>" (no internal newlines). If the skin appears healthy, set the condition to "Healthy".
- report: a detailed MARKDOWN report with these sections — ### Dermoscopic Observations, ### Differential Diagnosis (with reasoning), ### Brief Pathophysiology, ### Management Plan (pharmacological, procedural, lifestyle/home care), ### Red Flags & When to Refer, ### Prognosis & Follow-up.
- jarvis: 4-6 markdown bullet points of guidance for the treating doctor — current evidence-based treatments, prescription considerations (drug classes/mechanisms), and the recommended next diagnostic steps.

Write for a physician audience: precise, clinical, and empathetic."""


def _loads_lenient(text: str) -> dict:
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text[:4].lower() == "json":
            text = text[4:]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return json.loads(text, strict=False)


def _strip_md_fence(text: str) -> str:
    """Unwrap a whole-response ```markdown fence.

    Sarvam often returns the entire note wrapped in a fence, which the UI then
    renders as one grey code block instead of a formatted report. Only strips when
    the fence encloses the WHOLE string, so genuine inline code blocks survive.
    """
    t = (text or "").strip()
    if not t.startswith("```") or not t.endswith("```"):
        return t
    head, sep, rest = t[3:-3].partition("\n")
    if not sep:                                              # one-liner ```foo```
        return t
    if head.strip().lower() not in ("", "markdown", "md", "text"):
        return t                                             # ```python -> real code
    if "```" in rest:                                        # inner fences -> not a wrapper
        return t
    return rest.strip()


def _raise_for_status_verbose(resp: requests.Response, provider: str) -> None:
    """Like resp.raise_for_status(), but keeps the provider's error body.

    Plain raise_for_status() reports only "400 Client Error: Bad Request for url: ..."
    and discards the body -- which is where the actionable message lives (an invalid
    API key, a retired model name). Losing it turns a one-line fix into a log hunt.
    """
    if resp.ok:
        return
    detail = (resp.text or "").strip()
    try:
        payload = resp.json()
        detail = str(payload.get("error", payload)) if isinstance(payload, dict) else str(payload)
    except ValueError:
        pass
    raise requests.HTTPError(
        f"{provider} HTTP {resp.status_code}: {detail[:600]}", response=resp
    )


def _gemini_text(payload: dict) -> str:
    """Pull the text out of a generateContent response, or explain why there isn't any.

    A 200 response can still carry no text -- blocked by a safety filter, or the
    thinking budget consumed maxOutputTokens (finishReason MAX_TOKENS), which leaves
    `content` with no `parts`. Indexing straight in would raise a bare KeyError.
    """
    candidates = payload.get("candidates") or []
    if not candidates:
        raise RuntimeError(f"gemini returned no candidates: {payload.get('promptFeedback', payload)}")
    cand = candidates[0]
    parts = (cand.get("content") or {}).get("parts") or []
    for part in parts:
        if part.get("text"):
            return part["text"]
    raise RuntimeError(
        f"gemini returned no text (finishReason={cand.get('finishReason')}); "
        "if MAX_TOKENS, raise maxOutputTokens -- thinking tokens count against it."
    )


def _gemini_post(body: dict) -> tuple[dict, str]:
    """POST to each configured Gemini model in turn; return (payload, model_used)."""
    errors = []
    deadline = time.monotonic() + GEMINI_BUDGET_S
    for model in GEMINI_MODELS:
        remaining = deadline - time.monotonic()
        if remaining < 5:
            errors.append(f"gemini budget ({GEMINI_BUDGET_S:.0f}s) exhausted before {model}")
            break
        try:
            # Key goes in a header, not ?key=: requests puts the full URL in its error
            # messages, which previously printed the API key into the Render logs.
            r = requests.post(f"{GEMINI_BASE_URL}/{model}:generateContent",
                              headers={"x-goog-api-key": GOOGLE_API_KEY or ""},
                              json=body, timeout=(5, remaining))
        except (requests.Timeout, requests.ConnectionError) as e:
            print(f"[gemini] {model} timed out / unreachable, trying next: {type(e).__name__}")
            errors.append(f"gemini/{model}: {type(e).__name__}")
            continue
        if r.ok:
            return r.json(), model
        try:
            _raise_for_status_verbose(r, f"gemini/{model}")
        except requests.HTTPError as e:
            if r.status_code not in _GEMINI_FALLTHROUGH:
                raise
            print(f"[gemini] {model} unavailable, trying next: {e}")
            errors.append(str(e))
    raise RuntimeError(" || ".join(errors) or "no GEMINI_MODEL configured")


def gemini_generate_json(system_text: str, user_text: str, image_b64: Optional[str]) -> tuple[dict, str]:
    """Gemini vision call returning structured JSON (verify/prediction/report/jarvis)."""
    parts = [{"text": user_text}]
    if image_b64:
        parts.append({"inline_data": {"mime_type": "image/jpeg", "data": image_b64}})
    body = {
        "systemInstruction": {"parts": [{"text": system_text}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 8192,
            "responseMimeType": "application/json",
            "responseSchema": _RESPONSE_SCHEMA,
        },
    }
    payload, model = _gemini_post(body)
    return _loads_lenient(_gemini_text(payload)), model


def gemini_generate_text(system_text: str, user_text: str) -> str:
    """Plain-text Gemini call (chatbot)."""
    body = {
        "systemInstruction": {"parts": [{"text": system_text}]},
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        # Gemini 3.x thinks by default and thinking tokens count against this cap.
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 8192},
    }
    payload, _ = _gemini_post(body)
    return _gemini_text(payload)


def sarvam_generate_text(system_text: str, user_text: str) -> str:
    """Sarvam (OpenAI-compatible, text-only, reasoning-capped) call."""
    body = {
        "model": SARVAM_MODEL,
        "messages": [
            {"role": "system", "content": system_text},
            {"role": "user", "content": user_text},
        ],
        "temperature": 0.3,
        # Reasoning model: hidden reasoning_content counts against this. 4000 was
        # observed to run out (finish_reason=length, content=null) on a short note.
        "max_tokens": 8000,
        "reasoning_effort": "low",
    }
    headers = {"Authorization": f"Bearer {SARVAM_API_KEY}", "Content-Type": "application/json"}
    r = requests.post(f"{SARVAM_BASE_URL}/chat/completions", json=body, headers=headers, timeout=90)
    _raise_for_status_verbose(r, "sarvam")
    choice = r.json()["choices"][0]
    content = (choice["message"].get("content") or "").strip()
    if not content:
        # Reasoning models return content=null when max_tokens is spent on
        # reasoning_content. Fail loudly rather than shipping a placeholder note.
        raise RuntimeError(
            f"{SARVAM_MODEL} returned empty content (finish_reason="
            f"{choice.get('finish_reason')}); raise max_tokens."
        )
    return _strip_md_fence(content)


# --------------------------- LangGraph definition --------------------------- #
class GraphState(TypedDict, total=False):
    user_text: str
    image_b64: Optional[str]
    primary: dict
    secondary: dict
    result: Optional[dict]
    provider: Optional[str]
    model: Optional[str]
    # Kept per-provider: a single `error` slot let the sarvam failure overwrite the
    # gemini one, so the 502 only ever reported the fallback's error.
    gemini_error: Optional[str]
    sarvam_error: Optional[str]


def _gemini_node(state: GraphState) -> GraphState:
    try:
        data, model = gemini_generate_json(SYSTEM_PROMPT, state["user_text"], state.get("image_b64"))
        return {"result": data, "provider": "gemini", "model": model}
    except Exception as e:
        print(f"[gemini] failed -> falling back to sarvam: {e}")
        return {"result": None, "gemini_error": str(e)}


def _sarvam_node(state: GraphState) -> GraphState:
    """Text-only fallback: build CSV fields from CNN, use Sarvam for a concise report."""
    if not SARVAM_API_KEY:
        return {"result": None, "sarvam_error": "not configured (set SARVAM_API_KEY)"}
    try:
        p = state.get("primary") or {}
        s = state.get("secondary") or {}
        p_class = p.get("class", "Unknown")
        p_conf = float(p.get("confidence", 0.0))
        s_class = s.get("class", "Unknown")
        conf_pct = int(round(p_conf * 100))

        prompt = (
            f"A CNN classifier suggests '{p_class}' (confidence {p_conf:.2f}), with "
            f"'{s_class}' as a secondary possibility. No image is available to you, so rely "
            "on these predictions and standard dermatology. In UNDER 200 words, produce a "
            "concise MARKDOWN clinical note with: likely condition, brief reasoning, key "
            "management (topical/oral/lifestyle), and red flags / when to refer. State clearly "
            "that direct visual/dermoscopic confirmation by the clinician is required."
        )
        report = sarvam_generate_text(
            "You are an expert dermatologist writing for another doctor. Answer directly and concisely, no preamble.",
            prompt,
        ) or "Text-only fallback: report unavailable."

        result = {
            "verify": "Undetermined,0,Normal,No image was reviewed (text-only fallback); the CNN cannot distinguish healthy skin — clinician must confirm visually",
            "prediction": f"{p_class},{conf_pct},CNN model prediction; direct visual/dermoscopic confirmation by the clinician is required (text-only fallback).",
            "report": report,
            "jarvis": (f"**Text-only fallback ({SARVAM_MODEL}).** The primary vision model was "
                       "unavailable, so this note is based on the CNN prediction only. Confirm "
                       "visually/dermoscopically before treatment and consider biopsy if any "
                       "malignant features are suspected."),
        }
        return {"result": result, "provider": "sarvam", "model": SARVAM_MODEL}
    except Exception as e:
        print(f"[sarvam] failed: {e}")
        return {"result": None, "sarvam_error": str(e)}


def _route_after_gemini(state: GraphState) -> str:
    return END if state.get("result") else "sarvam"


_graph = StateGraph(GraphState)
_graph.add_node("gemini", _gemini_node)
_graph.add_node("sarvam", _sarvam_node)
_graph.add_edge(START, "gemini")
_graph.add_conditional_edges("gemini", _route_after_gemini, {"sarvam": "sarvam", END: END})
_graph.add_edge("sarvam", END)
analysis_graph = _graph.compile()


def run_analysis(user_text: str, image_b64: Optional[str], primary: dict, secondary: dict) -> tuple[dict, str, str]:
    state = analysis_graph.invoke({
        "user_text": user_text, "image_b64": image_b64,
        "primary": primary, "secondary": secondary,
    })
    if not state.get("result"):
        raise HTTPException(status_code=502, detail=(
            "AI service error -- both providers failed. "
            f"gemini: {state.get('gemini_error')} | sarvam: {state.get('sarvam_error')}"
        ))
    return state["result"], state.get("provider", "unknown"), state.get("model") or "unknown"


def answer_question(system_text: str, user_text: str) -> str:
    try:
        return gemini_generate_text(system_text, user_text)
    except Exception as gemini_err:
        print(f"[gemini /ans] failed -> sarvam: {gemini_err}")
        if not SARVAM_API_KEY:
            raise HTTPException(status_code=502, detail=f"AI service error -- gemini: {gemini_err}")
        try:
            return sarvam_generate_text(system_text, user_text)
        except Exception as sarvam_err:
            # Previously this escaped unhandled and FastAPI returned a bare
            # "Internal Server Error" with no clue which provider broke.
            print(f"[sarvam /ans] failed: {sarvam_err}")
            raise HTTPException(status_code=502, detail=(
                "AI service error -- both providers failed. "
                f"gemini: {gemini_err} | sarvam: {sarvam_err}"
            ))


# --------------------------------------------------------------------------- #
# App
# --------------------------------------------------------------------------- #
class Id(BaseModel):
    obj_id: str
    imageUrl: Optional[str] = None


class Query(BaseModel):
    query: str
    deep_search: bool = False


app = FastAPI(title="ShushrutAI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to the ShrushrutAI"}


def resolve_image_url(obj_id: str, image_url: Optional[str]) -> str:
    if image_url and image_url.strip():
        return image_url
    if db is None:
        raise HTTPException(status_code=400, detail="No imageUrl provided and Firestore is unavailable.")
    doc = db.collection("patients").document(obj_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Patient document not found")
    images = doc.to_dict().get("skinImages", [])
    if not images:
        raise HTTPException(status_code=404, detail="No images found in patient record")
    return images[-1]


def fetch_image(image_url: str) -> Image.Image:
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(image_url, headers=headers, timeout=15)
    resp.raise_for_status()
    return Image.open(io.BytesIO(resp.content)).convert("RGB")


@app.post("/predict")
def classify_image(req: Id):
    image_url = resolve_image_url(req.obj_id, req.imageUrl)

    try:
        image = fetch_image(image_url)
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Error fetching image: {e}")

    res_c = predict_c(image)
    res_d = predict_d(image)
    primary, secondary = (res_c, res_d) if res_c["confidence"] >= res_d["confidence"] else (res_d, res_c)

    buf = io.BytesIO()
    image.save(buf, format="JPEG")
    image_b64 = base64.b64encode(buf.getvalue()).decode()

    user_text = (
        "A skin image has been submitted for analysis. Two closed-set CNN classifiers "
        "(no healthy class — they always name a disease) report, for reference only:\n"
        f"- Model A: {primary['class']} ({primary['confidence']:.2f}); "
        f"runner-up {primary.get('runner_up', 'n/a')} ({primary.get('runner_up_confidence', 0):.2f})\n"
        f"- Model B: {secondary['class']} ({secondary['confidence']:.2f}); "
        f"runner-up {secondary.get('runner_up', 'n/a')} ({secondary.get('runner_up_confidence', 0):.2f})\n\n"
        "First decide from the image itself whether any pathology is visible at all "
        "(STEP 0). If the skin looks normal, report Healthy regardless of the CNN. "
        "Otherwise analyze it dermoscopically using your framework and corroborate or "
        "challenge the CNN prior. If no image is attached, reason from the CNN predictions "
        "and note that direct visual confirmation is required. "
        "Produce the structured analysis exactly as specified."
    )

    data, provider, model = run_analysis(user_text, image_b64, primary, secondary)
    print(f"[analysis] provider={provider} model={model}")

    verify = str(data.get("verify") or "Unknown,0,Normal,No remarks")
    prediction = str(data.get("prediction") or f"{primary['class']},{primary['confidence'] * 100:.0f},")
    report = str(data.get("report") or "No detailed report available.")
    jarvis = str(data.get("jarvis") or "")

    # Names the model that actually answered (Gemini may have fallen through the list).
    provider_label = {"gemini": "Google Gemini", "sarvam": "Sarvam"}.get(provider, provider)
    provider_label = f"{provider_label} ({model})"
    report = f"{report}\n\n---\n*🩺 Report generated by ShushrutAI — powered by **{provider_label}**.*"

    verify_parts = [v.strip() for v in verify.split(",")]
    status = verify_parts[0].lower()
    is_healthy = status == "healthy"
    is_invalid = status == "invalid"

    pred_parts = prediction.split(",")
    diagnosis = pred_parts[0].strip() if pred_parts else primary["class"]
    try:
        confidence = float(pred_parts[1].replace("%", "").strip()) / 100 if len(pred_parts) > 1 else primary["confidence"]
    except (ValueError, IndexError):
        confidence = primary["confidence"]

    # The vision model's verify verdict is the gate. If it saw healthy skin but
    # still echoed a CNN disease name into `prediction`, the headline must not
    # contradict it -- the CNN cannot say "healthy", so it never gets the last word.
    if is_healthy and diagnosis.lower() != "healthy":
        try:
            confidence = float(verify_parts[1].replace("%", "")) / 100
        except (ValueError, IndexError):
            pass
        remark = " ".join(pred_parts[2:]).strip() or "No visible pathology; CNN suggestion disregarded."
        diagnosis = "Healthy"
        prediction = f"Healthy,{confidence * 100:.0f},{remark}"
    if is_invalid:
        # Not human skin: neither a disease name nor "Healthy" is an honest headline.
        remark = " ".join(pred_parts[2:]).strip() or (verify_parts[3] if len(verify_parts) > 3 else "")
        diagnosis, confidence = "Not a skin image", 0.0
        prediction = f"Not a skin image,0,{remark}"
    if status == "undetermined":
        # Text-only fallback: nothing looked at the image, and the CNN cannot say
        # "healthy", so its class must not be presented as a diagnosis at 100%.
        remark = " ".join(pred_parts[2:]).strip()
        diagnosis, confidence = f"Undetermined (unverified CNN suggestion: {pred_parts[0].strip()})", 0.0
        prediction = f"{diagnosis},0,{remark}"
    confidence = max(0.0, min(1.0, confidence))

    result = {
        "imageUrl": image_url,
        "verify": verify,
        "prediction": prediction,
        "report": report,
        "jarvis": jarvis,
        "diagnosis": diagnosis,
        "confidence": round(confidence, 2),
        "provider": provider,
        "timestamp": {"_seconds": int(time.time())},
    }

    if db is not None:
        try:
            saved = {
                "patientId": req.obj_id,
                "timestamp": firestore.SERVER_TIMESTAMP,
                "imageUrl": image_url,
                "verify": verify, "prediction": prediction,
                "report": report, "jarvis": jarvis,
            }
            db.collection("patients").document(req.obj_id).collection("reports").add(saved)
            db.collection("diagnoses").document("latest").set(saved)
        except Exception as e:
            print(f"[warn] Could not save report to Firestore: {e}")

    return result


@app.post("/ans")
def get_ans(q: Query):
    context = ""
    if db is not None:
        try:
            doc = db.collection("diagnoses").document("latest").get()
            if doc.exists:
                d = doc.to_dict()
                context = d.get("prediction", "") or d.get("report", "")
        except Exception:
            context = ""

    system_text = (
        "You are ShushrutAI, an expert dermatologist assistant answering another doctor. "
        "Give concise, evidence-based, professional answers. Reference guidance at the "
        "organisation level (AAD, NCCN, BAD, WHO); do not fabricate URLs."
    )
    user_text = f"Diagnosis context: {context or 'No context available'}.\n\nQuestion: {q.query}"
    return {"response": answer_question(system_text, user_text)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 6700))
    png_data = analysis_graph.get_graph().draw_mermaid_png()

# 2. Save the image data to a file
    with open("graph.png", "wb") as f:
        f.write(png_data)
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
