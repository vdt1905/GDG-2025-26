"""
ShushrutAI — skin-image analysis API (LangGraph edition).

Pipeline (per /predict) — unchanged flow, new LLM layer:
  1. Resolve the image URL (from the request, or the patient's latest skin image).
  2. Run the local PyTorch classifiers (predict_c + predict_d) for a suspected class.
  3. Run a LangGraph graph that produces ONE structured analysis JSON:
        gemini (vision, primary)  --on failure-->  sarvam (text, fallback)
     returning {verify, prediction, report, jarvis}.
  4. Save the report to Firestore and return it to the frontend.

Note: Sarvam is a text-only model and cannot see the image. On the fallback path it
reasons from the CNN predictions only and flags that visual confirmation is required.
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
from pydantic import BaseModel, Field
from dotenv import load_dotenv

import gc
import torch
torch.set_num_threads(1)  # limit CPU/memory footprint on small hosts (Render 512MB)

from predict_c import predict_c
from predict_d import predict_d

load_dotenv()

# --------------------------------------------------------------------------- #
# TLS: build one CA bundle = certifi + OS (Windows) root store, so `requests`
# AND the LangChain/Gemini REST client verify HTTPS even when an antivirus/proxy
# intercepts traffic with a root that isn't in certifi. No-op on Linux.
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
os.environ.setdefault("SSL_CERT_FILE", _CA_BUNDLE)         # openssl / stdlib ssl
os.environ.setdefault("REQUESTS_CA_BUNDLE", _CA_BUNDLE)    # requests / httpx
os.environ.setdefault("GRPC_DEFAULT_SSL_ROOTS_FILE_PATH", _CA_BUNDLE)  # gRPC (Firestore)

# --------------------------------------------------------------------------- #
# Firebase (optional — only needed to auto-resolve images / save reports)
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
# LLM providers via LangChain + orchestration via LangGraph
# --------------------------------------------------------------------------- #
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, START, END

try:
    from langchain_openai import ChatOpenAI
except Exception:  # langchain-openai not installed
    ChatOpenAI = None

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Sarvam is OpenAI-compatible (https://api.sarvam.ai/v1). Options: sarvam-30b, sarvam-105b.
SARVAM_MODEL = os.getenv("SARVAM_MODEL", "sarvam-30b")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
SARVAM_BASE_URL = os.getenv("SARVAM_BASE_URL", "https://api.sarvam.ai/v1")

gemini_llm = ChatGoogleGenerativeAI(
    model=GEMINI_MODEL,
    google_api_key=GOOGLE_API_KEY,
    temperature=0.3,
    max_output_tokens=8192,
)

sarvam_llm = None
if SARVAM_API_KEY and ChatOpenAI is not None:
    # sarvam-30b is a reasoning model that spends its completion budget "thinking",
    # so we cap reasoning (reasoning_effort=low) and ask it only for a CONCISE note.
    sarvam_llm = ChatOpenAI(
        model=SARVAM_MODEL,
        base_url=SARVAM_BASE_URL,
        api_key=SARVAM_API_KEY,
        temperature=0.3,
        max_tokens=4000,
        extra_body={"reasoning_effort": "low"},
    )


class Analysis(BaseModel):
    """Structured analysis contract shared by both providers."""
    verify: str = Field(description="Single line: '<Healthy|Unhealthy>,<confidence %>,<Dry|Oily|Normal>,<one-line remark>'")
    prediction: str = Field(description="Single line: '<most likely condition>,<confidence %>,<two-line remark>'")
    report: str = Field(description="Detailed markdown clinical report.")
    jarvis: str = Field(description="4-6 point markdown clinical guidance for the treating doctor.")


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


# --------------------------- LangGraph definition --------------------------- #
class GraphState(TypedDict, total=False):
    user_text: str
    image_b64: Optional[str]
    primary: dict          # CNN top prediction {class, confidence}
    secondary: dict        # CNN second prediction
    result: Optional[dict]
    provider: Optional[str]
    error: Optional[str]


def _gemini_node(state: GraphState) -> GraphState:
    """Primary: Gemini vision model with structured output over the image."""
    try:
        content = [{"type": "text", "text": state["user_text"]}]
        if state.get("image_b64"):
            content.append({"type": "image_url", "image_url": f"data:image/jpeg;base64,{state['image_b64']}"})
        messages = [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=content)]
        out = gemini_llm.with_structured_output(Analysis).invoke(messages)
        return {"result": out.model_dump(), "provider": "gemini"}
    except Exception as e:
        print(f"[gemini] failed -> falling back to sarvam: {e}")
        return {"result": None, "error": str(e)}


def _sarvam_node(state: GraphState) -> GraphState:
    """Fallback: Sarvam is text-only + reasoning-heavy, so we build the CSV fields
    deterministically from the CNN predictions and use Sarvam only for a CONCISE
    markdown clinical note (it cannot see the image)."""
    if sarvam_llm is None:
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
        resp = sarvam_llm.invoke([
            SystemMessage(content="You are an expert dermatologist writing for another doctor. Answer directly and concisely, no preamble."),
            HumanMessage(content=prompt),
        ])
        report = (resp.content or "").strip() or "Text-only fallback: report unavailable."

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
        "user_text": user_text,
        "image_b64": image_b64,
        "primary": primary,
        "secondary": secondary,
    })
    if not state.get("result"):
        raise HTTPException(status_code=502, detail=f"AI service error: {state.get('error')}")
    return state["result"], state.get("provider", "unknown")


def answer_question(system_text: str, user_text: str) -> str:
    """Chatbot text generation with the same Gemini -> Sarvam fallback."""
    messages = [SystemMessage(content=system_text), HumanMessage(content=user_text)]
    try:
        return gemini_llm.invoke(messages).content
    except Exception as e:
        print(f"[gemini /ans] failed -> sarvam: {e}")
        if sarvam_llm is None:
            raise HTTPException(status_code=502, detail=f"AI service error: {e}")
        return sarvam_llm.invoke(messages).content


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

    # Local CNN predictions -> primary / secondary by confidence.
    res_c = predict_c(image)
    res_d = predict_d(image)
    gc.collect()  # free inference tensors before the LLM call
    primary, secondary = (res_c, res_d) if res_c["confidence"] >= res_d["confidence"] else (res_d, res_c)

    # Encode image as JPEG base64 for the vision model.
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

    # Attribution footer — which LLM produced this report.
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
                "verify": verify,
                "prediction": prediction,
                "report": report,
                "jarvis": jarvis,
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
