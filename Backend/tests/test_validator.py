import pytest
from app.validator import semantic_similarity, validate

def test_semantic_similarity():
    text = "The connection pool limit is configured to 50 connections."
    same_text = "The connection pool limit is configured to 50 connections."
    different_text = "The quick brown fox jumps over the lazy dog."
    
    sim_exact = semantic_similarity(text, same_text)
    sim_diff = semantic_similarity(text, different_text)
    
    assert pytest.approx(sim_exact, abs=1e-3) == 100.0
    assert sim_diff < 90.0

def test_validate():
    raw_text = "Database configuration: connection pool limit is set to 50. Primary logger name is app_primary."
    compressed_text = "DB config: pool limit 50. Primary logger app_primary."
    
    qa_pairs = [
        {"question": "What is the connection pool limit?", "expected_answer": "50"},
        {"question": "What is the primary logger name?", "expected_answer": "app_primary"}
    ]
    
    result = validate(raw_text, compressed_text, qa_pairs)
    
    assert "accuracy_retained" in result
    assert result["accuracy_retained"] is not None
    assert "providerUsed" in result
    assert "latency_speedup_ratio" in result
    # Since we are using mock LLM client fallback in tests (API keys not set),
    # both raw and compressed should match well, resulting in high retention.
    assert 0.0 <= result["accuracy_retained"] <= 100.0
