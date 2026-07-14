"""
ShushrutAI — skin-image analysis API (LangGraph + ONNX, lightweight edition).

Designed to run in ~200MB RAM (fits a 512MB host):
  - CNN inference via ONNX Runtime (no torch -> ~5x less memory).
  - LLM calls via direct HTTP (no heavy langchain provider SDKs).
  - LangGraph orchestrates the Gemini(vision) -> Sarvam(text fallback) flow.

Pipeline (per /predict):
  1. Resolve the image URL (request, or the patient's latest skin image).
  2. Run the local ONNX classifiers (predict_c + predict_d).
  3. LangGraph: gemini (vision, primary) --on failure--> sarvam-30b (text fallback).
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
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_ENDPOINT = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

SARVAM_MODEL = os.getenv("SARVAM_MODEL", "sarvam-30b")
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

A convolutional neural network (CNN) has already classified the image. Treat its output as a PRIOR, not ground truth — corroborate or challenge it from the visible dermoscopic evidence. If no image is available to you (fallback path), reason from the CNN predictions and standard dermatology, and state clearly in the remarks that direct visual/dermoscopic confirmation by the clinician is required.

CLINICAL GOVERNANCE:
- Provide realistic, calibrated confidence — never a blanket 100%.
- Be explicit about uncertainty and limitations (single view, image quality, absent history/dermoscopy).
- This is clinician decision support, not a definitive diagnosis; always recommend appropriate confirmatory steps.
- Do NOT fabricate citations or URLs. Reference guidance at the organisation level (e.g., AAD, NCCN, British Association of Dermatologists, WHO) only.

OUTPUT CONTRACT — return ONLY these fields:
- verify: ONE comma-separated line "<Healthy|Unhealthy>,<confidence %>,<Dry|Oily|Normal>,<one-line remark>" (no internal newlines).
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


def gemini_generate_json(system_text: str, user_text: str, image_b64: Optional[str]) -> dict:
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
    r = requests.post(GEMINI_ENDPOINT, params={"key": GOOGLE_API_KEY}, json=body, timeout=90)
    r.raise_for_status()
    text = r.json()["candidates"][0]["content"]["parts"][0]["text"]
    return _loads_lenient(text)


def gemini_generate_text(system_text: str, user_text: str) -> str:
    """Plain-text Gemini call (chatbot)."""
    body = {
        "systemInstruction": {"parts": [{"text": system_text}]},
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048},
    }
    r = requests.post(GEMINI_ENDPOINT, params={"key": GOOGLE_API_KEY}, json=body, timeout=90)
    r.raise_for_status()
    return r.json()["candidates"][0]["content"]["parts"][0]["text"]


def sarvam_generate_text(system_text: str, user_text: str) -> str:
    """Sarvam (OpenAI-compatible, text-only, reasoning-capped) call."""
    body = {
        "model": SARVAM_MODEL,
        "messages": [
            {"role": "system", "content": system_text},
            {"role": "user", "content": user_text},
        ],
        "temperature": 0.3,
        "max_tokens": 4000,
        "reasoning_effort": "low",
    }
    headers = {"Authorization": f"Bearer {SARVAM_API_KEY}", "Content-Type": "application/json"}
    r = requests.post(f"{SARVAM_BASE_URL}/chat/completions", json=body, headers=headers, timeout=90)
    r.raise_for_status()
    return (r.json()["choices"][0]["message"]["content"] or "").strip()


# --------------------------- LangGraph definition --------------------------- #
class GraphState(TypedDict, total=False):
    user_text: str
    image_b64: Optional[str]
    primary: dict
    secondary: dict
    result: Optional[dict]
    provider: Optional[str]
    error: Optional[str]


def _gemini_node(state: GraphState) -> GraphState:
    try:
        data = gemini_generate_json(SYSTEM_PROMPT, state["user_text"], state.get("image_b64"))
        return {"result": data, "provider": "gemini"}
    except Exception as e:
        print(f"[gemini] failed -> falling back to sarvam: {e}")
        return {"result": None, "error": str(e)}


def _sarvam_node(state: GraphState) -> GraphState:
    """Text-only fallback: build CSV fields from CNN, use Sarvam for a concise report."""
    if not SARVAM_API_KEY:
        return {"result": None, "error": "Sarvam fallback not configured (set SARVAM_API_KEY)."}
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
            "verify": f"Unhealthy,{conf_pct},Normal,Text-only fallback — visual confirmation required",
            "prediction": f"{p_class},{conf_pct},CNN model prediction; direct visual/dermoscopic confirmation by the clinician is required (text-only fallback).",
            "report": report,
            "jarvis": ("**Text-only fallback (Sarvam-30b).** The primary vision model was "
                       "unavailable, so this note is based on the CNN prediction only. Confirm "
                       "visually/dermoscopically before treatment and consider biopsy if any "
                       "malignant features are suspected."),
        }
        return {"result": result, "provider": "sarvam"}
    except Exception as e:
        print(f"[sarvam] failed: {e}")
        return {"result": None, "error": str(e)}


def _route_after_gemini(state: GraphState) -> str:
    return END if state.get("result") else "sarvam"


_graph = StateGraph(GraphState)
_graph.add_node("gemini", _gemini_node)
_graph.add_node("sarvam", _sarvam_node)
_graph.add_edge(START, "gemini")
_graph.add_conditional_edges("gemini", _route_after_gemini, {"sarvam": "sarvam", END: END})
_graph.add_edge("sarvam", END)
analysis_graph = _graph.compile()


def run_analysis(user_text: str, image_b64: Optional[str], primary: dict, secondary: dict) -> tuple[dict, str]:
    state = analysis_graph.invoke({
        "user_text": user_text, "image_b64": image_b64,
        "primary": primary, "secondary": secondary,
    })
    if not state.get("result"):
        raise HTTPException(status_code=502, detail=f"AI service error: {state.get('error')}")
    return state["result"], state.get("provider", "unknown")


def answer_question(system_text: str, user_text: str) -> str:
    try:
        return gemini_generate_text(system_text, user_text)
    except Exception as e:
        print(f"[gemini /ans] failed -> sarvam: {e}")
        if not SARVAM_API_KEY:
            raise HTTPException(status_code=502, detail=f"AI service error: {e}")
        return sarvam_generate_text(system_text, user_text)


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
        "A skin lesion image has been submitted for analysis. A CNN classifier reports:\n"
        f"- Primary: {primary['class']} (confidence {primary['confidence']:.2f})\n"
        f"- Secondary: {secondary['class']} (confidence {secondary['confidence']:.2f})\n\n"
        "If an image is attached, analyze it dermoscopically using your framework and "
        "corroborate or challenge the CNN prior. If no image is attached, reason from the "
        "CNN predictions and note that direct visual confirmation is required. "
        "Produce the structured analysis exactly as specified."
    )

    data, provider = run_analysis(user_text, image_b64, primary, secondary)
    print(f"[analysis] provider={provider}")

    verify = str(data.get("verify") or "Unknown,0,Normal,No remarks")
    prediction = str(data.get("prediction") or f"{primary['class']},{primary['confidence'] * 100:.0f},")
    report = str(data.get("report") or "No detailed report available.")
    jarvis = str(data.get("jarvis") or "")

    provider_label = {"gemini": "Google Gemini", "sarvam": "Sarvam-30b"}.get(provider, provider)
    report = f"{report}\n\n---\n*🩺 Report generated by ShushrutAI — powered by **{provider_label}**.*"

    pred_parts = prediction.split(",")
    diagnosis = pred_parts[0].strip() if pred_parts else primary["class"]
    try:
        confidence = float(pred_parts[1].replace("%", "").strip()) / 100 if len(pred_parts) > 1 else primary["confidence"]
    except (ValueError, IndexError):
        confidence = primary["confidence"]

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
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
