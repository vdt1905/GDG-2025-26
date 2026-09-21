"""CI smoke tests for the AI server.

Run with:  cd PYTHON && pytest -q

They need NO secrets: no Gemini/Sarvam keys, no Firebase credentials. The LLM
call is stubbed, so these check our own logic (routing, the ONNX models, and the
healthy/invalid gate) rather than an external API.
"""
import os
import sys

import pytest
from PIL import Image
from fastapi.testclient import TestClient

# Import from the PYTHON/ folder regardless of where pytest is started, and use
# it as the working dir so the relative model paths resolve as in production.
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, HERE)
os.chdir(HERE)

import main  # noqa: E402
from predict_c import predict_c, CLASS_NAMES as C_CLASSES  # noqa: E402
from predict_d import predict_d, CLASS_NAMES as D_CLASSES  # noqa: E402


@pytest.fixture
def client(monkeypatch):
    # Never touch a real database from tests, even if credentials are present.
    monkeypatch.setattr(main, "db", None)
    # No network: hand /predict a local image instead of downloading one.
    monkeypatch.setattr(main, "fetch_image", lambda url: Image.new("RGB", (300, 300), (200, 160, 140)))
    return TestClient(main.app)


def stub_llm(monkeypatch, verify, prediction):
    """Replace the Gemini/Sarvam step with a fixed answer."""
    canned = {"verify": verify, "prediction": prediction, "report": "### Notes\n- ok", "jarvis": "- ok"}
    monkeypatch.setattr(main, "run_analysis", lambda *a, **k: (canned, "gemini", "test-model"))


def test_health_endpoint(client):
    r = client.get("/")
    assert r.status_code == 200


@pytest.mark.parametrize("predict, classes", [(predict_c, C_CLASSES), (predict_d, D_CLASSES)])
def test_onnx_models_load_and_predict(predict, classes):
    out = predict(Image.new("RGB", (400, 300), (180, 120, 110)))
    assert out["class"] in classes
    assert 0.0 <= out["confidence"] <= 1.0
    assert out["runner_up"] in classes and out["runner_up"] != out["class"]


def test_unhealthy_keeps_the_diagnosis(client, monkeypatch):
    stub_llm(monkeypatch, "Unhealthy,80,Normal,Annular plaque", "Tinea corporis,80,Ringworm")
    d = client.post("/predict", json={"obj_id": "t", "imageUrl": "x"}).json()
    assert d["diagnosis"] == "Tinea corporis"
    assert d["confidence"] == 0.8


def test_healthy_verdict_overrides_a_cnn_disease_name(client, monkeypatch):
    # The CNNs have no healthy class, so the LLM may echo their disease guess.
    # The verify verdict must win.
    stub_llm(monkeypatch, "Healthy,92,Normal,No lesion", "Scabies,100,CNN said scabies")
    d = client.post("/predict", json={"obj_id": "t", "imageUrl": "x"}).json()
    assert d["diagnosis"] == "Healthy"
    assert d["confidence"] == 0.92


def test_non_skin_image_is_reported_as_such(client, monkeypatch):
    stub_llm(monkeypatch, "Invalid,99,Normal,A photo of a dog", "Scabies,100,x")
    d = client.post("/predict", json={"obj_id": "t", "imageUrl": "x"}).json()
    assert d["diagnosis"] == "Not a skin image"
    assert d["confidence"] == 0.0


def test_literal_newline_escapes_are_repaired():
    backslash = chr(92)
    parsed = main._loads_lenient('{"report": "### A' + backslash * 2 + 'n- b"}')
    assert parsed["report"] == "### A\n- b"
