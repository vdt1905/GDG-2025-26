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


# ----------------------------------------------------- LLM fallback chain tests
class FakeResponse:
    def __init__(self, status, payload):
        self.status_code, self._payload = status, payload
        self.ok = 200 <= status < 300
        self.text = str(payload)

    def json(self):
        return self._payload


GEMINI_OK = {"candidates": [{"content": {"parts": [{"text": "ok"}]}, "finishReason": "STOP"}]}
SARVAM_OK = {"choices": [{"message": {"content": "note"}, "finish_reason": "stop"}]}


@pytest.fixture
def fake_http(monkeypatch):
    """Route requests.post to a per-model scripted status; record the call order."""
    monkeypatch.setattr(main, "_cooldown_until", {})
    calls, script = [], {}

    def post(url, json=None, **kw):
        model = json.get("model") or url.split("/models/")[1].split(":")[0]
        calls.append(model)
        status = script.get(model, 200)
        if status != 200:
            return FakeResponse(status, {"error": {"message": f"{model} said {status}"}})
        return FakeResponse(200, SARVAM_OK if "sarvam" in model else GEMINI_OK)

    monkeypatch.setattr(main.requests, "post", post)
    monkeypatch.setattr(main, "GEMINI_MODELS", ["g1", "g2", "g3"])
    monkeypatch.setattr(main, "SARVAM_MODELS", ["sarvam-a", "sarvam-b"])
    return calls, script


def test_gemini_falls_through_overloaded_and_retired_models(fake_http):
    calls, script = fake_http
    script.update({"g1": 503, "g2": 404})
    _, model = main._gemini_post({})
    assert model == "g3"
    assert calls == ["g1", "g2", "g3"]


def test_failed_model_is_skipped_on_the_next_request(fake_http):
    calls, script = fake_http
    script["g1"] = 503
    main._gemini_post({})
    calls.clear()
    _, model = main._gemini_post({})
    assert calls == ["g2"], "g1 should be cooling down, not retried every request"
    assert model == "g2"


def test_bad_key_stops_the_chain_instead_of_trying_every_model(fake_http):
    calls, script = fake_http
    script["g1"] = 403            # same key would fail identically on every model
    with pytest.raises(Exception):
        main._gemini_post({})
    assert calls == ["g1"]


def test_everything_cooling_down_still_gets_one_more_try(fake_http):
    calls, script = fake_http
    script.update({"g1": 503, "g2": 503, "g3": 503})
    with pytest.raises(RuntimeError):
        main._gemini_post({})
    calls.clear()
    script.clear()                 # the service recovered
    _, model = main._gemini_post({})
    assert model == "g1", "with all models cooling down it must retry, not fail instantly"


def test_sarvam_chain_falls_through_and_reports_the_model_used(fake_http):
    calls, script = fake_http
    script["sarvam-a"] = 500
    text, model = main.sarvam_generate_text("sys", "user")
    assert (text, model) == ("note", "sarvam-b")
    assert calls == ["sarvam-a", "sarvam-b"]


def test_literal_newline_escapes_are_repaired():
    backslash = chr(92)
    parsed = main._loads_lenient('{"report": "### A' + backslash * 2 + 'n- b"}')
    assert parsed["report"] == "### A\n- b"
