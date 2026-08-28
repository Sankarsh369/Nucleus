import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_payload_boundary_success():
    # Exactly 200,000 characters payload
    text = "A" * 200000
    payload = {"text": text}
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert "compressed_text" in res

def test_payload_boundary_exceeded():
    # 200,001 characters payload (exceeds limit)
    text = "A" * 200001
    payload = {"text": text}
    response = client.post("/compress", json=payload)
    # Pydantic validation error
    assert response.status_code == 422

def test_line_exceeds_embedding_token_limit():
    # Embedding max tokens is 256. We engineer a single contiguous line
    # containing 400 words (which maps to > 300 tokens) to trigger recursive splitting.
    words = ["word"] * 400
    long_line = " ".join(words)
    payload = {"text": long_line}
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res = response.json()
    assert "compressed_text" in res
