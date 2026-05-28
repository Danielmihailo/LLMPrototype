import pytest
from fastapi.testclient import TestClient

from jarvis.inference.server import app

client = TestClient(app)


def test_health():
    r = client.get("/internal/brain/health")
    assert r.status_code == 200
    data = r.json()
    assert data["backend"] == "mock"


def test_infer_swap():
    r = client.post(
        "/internal/brain/infer",
        json={"messages": [{"role": "user", "content": "Tausche Hoodie Blue gegen Hoodie Black"}]},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["actions"][0]["operation"] == "swap_products"


def test_embed():
    r = client.post("/internal/brain/embed", json={"texts": ["hello shop"]})
    assert r.status_code == 200
    assert len(r.json()["vectors"][0]) == 384
