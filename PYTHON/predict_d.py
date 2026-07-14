"""Skin-disease classifier D (DenseNet121) — ONNX Runtime inference.

Exported from model_epoch_25.pth to ONNX so the server runs without torch.
Predictions match the torch version (validated: same class, conf diff ~4e-4).

NOTE: the ONNX graph is exported at a fixed 256x256 input (memory-safe). To use a
different resolution you must re-export the model at that size.
"""
import os
import numpy as np
from PIL import Image
import onnxruntime as ort

CLASS_NAMES = [
    "Acne and Rosacea Photos",
    "Actinic Keratosis Basal Cell Carcinoma and other Malignant Lesions",
    "Atopic Dermatitis Photos", "Bullous Disease Photos",
    "Cellulitis Impetigo and other Bacterial Infections",
    "Eczema Photos", "Exanthems and Drug Eruptions",
    "Hair Loss Photos Alopecia and other Hair Diseases",
    "Herpes HPV and other STDs Photos", "Light Diseases and Disorders of Pigmentation",
    "Lupus and other Connective Tissue diseases", "Melanoma Skin Cancer Nevi and Moles",
    "Nail Fungus and other Nail Disease", "Poison Ivy Photos and other Contact Dermatitis",
    "Psoriasis pictures Lichen Planus and related diseases",
    "Scabies Lyme Disease and other Infestations and Bites",
    "Seborrheic Keratoses and other Benign Tumors", "Systemic Disease",
    "Tinea Ringworm Candidiasis and other Fungal Infections",
    "Urticaria Hives", "Vascular Tumors", "Vasculitis Photos",
    "Warts Molluscum and other Viral Infections",
]

_INPUT_SIZE = 256  # must match the ONNX export size
_MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "skin_d.onnx")
_session = ort.InferenceSession(_MODEL_PATH, providers=["CPUExecutionProvider"])
_input_name = _session.get_inputs()[0].name

_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)[:, None, None]
_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)[:, None, None]


def _softmax(x):
    e = np.exp(x - np.max(x))
    return e / e.sum()


def predict_d(image: Image.Image):
    # Matches the original transform: Resize + ToTensor + Normalize(ImageNet).
    img = image.convert("RGB").resize((_INPUT_SIZE, _INPUT_SIZE), Image.BILINEAR)
    arr = (np.asarray(img, dtype=np.float32) / 255.0).transpose(2, 0, 1)
    arr = ((arr - _MEAN) / _STD)[None]
    logits = _session.run(None, {_input_name: arr})[0][0]
    probs = _softmax(logits)
    idx = int(np.argmax(probs))
    return {"class": CLASS_NAMES[idx], "confidence": float(probs[idx])}
