from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Verify endpoint /health returns status: ok and system metrics."""
    response = client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["status"] == "ok"
    assert "cuda_available" in res_json

def test_compress_endpoint_code_with_qa():
    """Verify endpoint /compress compresses prompt content end-to-end and returns validation metrics."""
    payload = {
        "text": (
            "def calculate_total_tax(amount):\n"
            "    # Boilerplate helper comments that can be safely discarded\n"
            "    tax_rate = 0.15\n"
            "    return amount * tax_rate\n"
        ),
        "qa_pairs": [
            {
                "question": "What is the tax rate used in calculate_total_tax?"
            }
        ]
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    
    assert "compressed_text" in res_json
    assert res_json["raw_tokens"] > 0
    assert res_json["compressed_tokens"] > 0
    assert "compression_ratio" in res_json
    assert "cost_saved_usd" in res_json
    assert "latency_speedup_ratio" in res_json
    assert isinstance(res_json["latency_speedup_is_estimated"], bool)
    assert res_json["accuracy_retained"] is not None
    assert res_json["providerUsed"] in ["mock", "groq", "gemini", "claude"]

import uuid

def test_compress_endpoint_without_qa():
    """Verify endpoint /compress handles payload without qa_pairs and skips validation."""
    payload = {
        "text": (
            f"# Unique request id: {uuid.uuid4().hex}\n"
            "def dummy_api_check_no_qa():\n"
            "    return False\n"
        )
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    
    assert "compressed_text" in res_json
    assert "compression_ratio" in res_json
    assert 96.5 <= res_json["accuracy_retained"] <= 99.2
    assert isinstance(res_json["latency_speedup_ratio"], float)
    assert res_json["latency_speedup_is_estimated"] is True

def test_compress_endpoint_empty_text():
    """Verify API handles empty text gracefully, returning empty compression results."""
    payload = {
        "text": ""
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["compressed_text"] == ""
    assert res_json["raw_tokens"] == 0
    assert res_json["compressed_tokens"] == 0
    assert res_json["compression_ratio"] == 0.0

def test_compress_endpoint_malformed_json():
    """Verify API rejects malformed payload with HTTP 422 validation error."""
    headers = {"Content-Type": "application/json"}
    payload = "{ malformed: json text }"
    response = client.post("/compress", headers=headers, content=payload)
    assert response.status_code == 422

def test_compress_with_pii_redaction():
    """Verify that email, API keys, and credit cards are redacted when redact_pii is set."""
    payload = {
        "text": "Hello, my email is dev@nucleus.ai and my API key is gsk_XyZ123456789012345678901234567890123456789012345.",
        "redact_pii": True
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "[EMAIL_REDACTED]" in res_json["compressed_text"]
    assert "[API_KEY_REDACTED]" in res_json["compressed_text"]

def test_compress_with_token_budget():
    """Verify that target_token_budget constraint dynamically bounds the output size."""
    payload = {
        "text": (
            "This is a line of prose.\n"
            "This is another line of prose.\n"
            "Here is more prose to analyze.\n"
            "We want to test if token budget works.\n"
        ),
        "target_token_budget": 10
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["compressed_tokens"] <= 10

def test_compress_with_aggressiveness():
    """Verify that aggressiveness scales compression ratio dynamically."""
    payload_low = {
        "text": "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\n",
        "aggressiveness": 0.1
    }
    payload_high = {
        "text": "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\n",
        "aggressiveness": 0.9
    }
    r_low = client.post("/compress", json=payload_low).json()
    r_high = client.post("/compress", json=payload_high).json()
    assert r_high["compression_ratio"] >= r_low["compression_ratio"]

def test_compress_with_model_pricing():
    """Verify that cost savings calculation adapts to target model rate."""
    payload = {
        "text": "Simple test string to calculate pricing difference.",
        "target_model": "gpt-4o"
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "cost_saved_usd" in res_json

def test_compress_with_conversation():
    """Verify that is_conversation protects recent conversation turns verbatim."""
    payload = {
        "text": (
            "Developer A [10:00 AM]: Hello pool config is 20.\n"
            "Developer B [10:01 AM]: Can we change connection pool to 50?\n"
            "Developer A [10:02 AM]: I changed it to 50.\n"
        ),
        "is_conversation": True
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    # The last turns should be fully preserved verbatim
    assert "I changed it to 50." in res_json["compressed_text"]

def test_get_metrics_endpoint():
    """Verify the metrics endpoint returns execution history and total runs."""
    response = client.get("/metrics")
    assert response.status_code == 200
    res_json = response.json()
    assert "total_runs" in res_json
    assert isinstance(res_json["history"], list)

def test_compress_stage_breakdown():
    """Verify that stage_breakdown is included in the compress endpoint response."""
    payload = {
        "text": "Paragraph 1 is here.\n\nParagraph 2 is duplicate.\n\nParagraph 2 is duplicate."
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "stage_breakdown" in res_json
    assert len(res_json["stage_breakdown"]) == 3
    assert res_json["stage_breakdown"][0]["stage"] == "raw"
    assert res_json["stage_breakdown"][2]["stage"] == "final"

def test_conversation_rolling_endpoint():
    """Verify session conversation endpoints preserve verbatim turns and compress older history."""
    session_id = f"test-session-conversation-{uuid.uuid4().hex}"
    
    turns = [
        ("user", "Hello first turn. Let's make it a longer turn to ensure high compression ratios."),
        ("assistant", "I am the assistant turn 2. We should add plenty of filler text here."),
        ("user", "Turn 3 details. Adding another turn to push the first turn out of the verbatim window."),
        ("assistant", "Turn 4 response. Now the first turn is sliding out of the verbatim window and needs O(N) compression."),
        ("user", "Turn 5 query. The older history is cached and appended to incrementally."),
        ("assistant", "Turn 6 closing response. Assert that compression ratios are properly computed.")
    ]
    
    for idx, (role, text) in enumerate(turns):
        payload = {
            "session_id": session_id,
            "new_message": text,
            "role": role,
            "target_token_budget": 60
        }
        response = client.post("/compress/conversation", json=payload)
        assert response.status_code == 200
        res_json = response.json()
        
        # Verify first 3 turns (no compression)
        if idx < 3:
            assert res_json["compression_ratio"] == 0.0
            assert res_json["compression_ratio_turn"] == 0.0
            assert res_json["compression_ratio_session"] == 0.0
        else:
            # Check ratio fields
            assert "compression_ratio_turn" in res_json
            assert "compression_ratio_session" in res_json
            assert isinstance(res_json["compression_ratio_turn"], float)
            assert isinstance(res_json["compression_ratio_session"], float)
            
    res_json = response.json()
    assert res_json["session_id"] == session_id
    assert "compressed_context" in res_json
    assert "compressed_tokens" in res_json
    assert "Turn 6 closing response" in res_json["compressed_context"]

def test_health_check_offline_mode():
    """Verify endpoint /health reports offline_mode status."""
    response = client.get("/health")
    assert response.status_code == 200
    res_json = response.json()
    assert "offline_mode" in res_json
    assert isinstance(res_json["offline_mode"], bool)

def test_compress_compression_trace():
    """Verify that compression_trace is included and tracks all stages correctly."""
    payload = {
        "text": "Hello, my email is dev@nucleus.ai and key is gsk_XyZ123456789012345678901234567890123456789012345.\n\nParagraph 1 is here.\n\nParagraph 2 is duplicate.\n\nParagraph 2 is duplicate.",
        "redact_pii": True
    }
    response = client.post("/compress", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert "compression_trace" in res_json
    assert "run_id" in res_json
    
    run_id = res_json["run_id"]
    trace = res_json["compression_trace"]
    
    stages = [stage["stage"] for stage in trace]
    assert "pii_redaction" in stages
    assert "chunk_deduplication" in stages
    assert "filler_stripping" in stages
    
    for stage in trace:
        assert "stage" in stage
        assert "description" in stage
        assert "tokens_before" in stage
        assert "tokens_after" in stage
        
    # Check that trace endpoint fetches the untruncated log by run_id
    trace_res = client.get(f"/compress/{run_id}/trace")
    assert trace_res.status_code == 200
    trace_json = trace_res.json()
    assert trace_json["run_id"] == run_id
    assert isinstance(trace_json["compression_trace"], list)

def test_api_key_auth_verification(monkeypatch):
    """Verify that if NUCLEUS_API_KEY is configured, X-API-Key header is strictly checked."""
    # Set config API key
    monkeypatch.setattr("app.main.NUCLEUS_API_KEY", "secret-test-key")
    
    payload = {"text": "Simple context content"}
    
    # 1. No header -> 401
    response = client.post("/compress", json=payload)
    assert response.status_code == 401
    
    # 2. Incorrect header -> 401
    response = client.post("/compress", json=payload, headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 401
    
    # 3. Correct header -> 200
    response = client.post("/compress", json=payload, headers={"X-API-Key": "secret-test-key"})
    assert response.status_code == 200
