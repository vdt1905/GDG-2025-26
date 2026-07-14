"""Skin-disease classifier C (custom CNN) — ONNX Runtime inference.

Exported from the original PyTorch model (skin_disease_model.pth) to ONNX so the
server can run without importing torch (~5x less RAM). Predictions are identical
to the torch version (validated: max abs diff ~3e-5).
"""
import os
import numpy as np
from PIL import Image
import onnxruntime as ort

CLASS_NAMES = [
    "Actinic keratosis",
    "Atopic Dermatitis",
    "Benign keratosis",
    "Dermatofibroma",
    "Melanocytic nevus",
    "Melanoma",
    "Squamous cell carcinoma",
    "Tinea Ringworm Candidiasis",
    "Vascular lesion",
]

_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "skin_c.onnx")
_session = ort.InferenceSession(_MODEL_PATH, providers=["CPUExecutionProvider"])
_input_name = _session.get_inputs()[0].name


def _softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


def predict_c(image: Image.Image):
    # Matches the original transform: Resize((128,128)) + ToTensor (0-1, CHW).
    img = image.convert("RGB").resize((128, 128), Image.BILINEAR)
    arr = (np.asarray(img, dtype=np.float32) / 255.0).transpose(2, 0, 1)[None]
    logits = _session.run(None, {_input_name: arr})[0][0]
    probs = _softmax(logits)
    idx = int(np.argmax(probs))
    return {"class": CLASS_NAMES[idx], "confidence": float(probs[idx])}
