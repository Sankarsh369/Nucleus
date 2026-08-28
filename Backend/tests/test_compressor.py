from app.ingestion import detect_type, chunk_text, count_tokens
from app.compressor import dedup_chunks, strip_filler, compress

def test_detect_type():
    python_code = "def calculate_sum(a, b):\n    return a + b\n\nclass Calculator:\n    pass"
    log_data = "2026-08-01 10:58:24 INFO: Server started successfully\n2026-08-01 10:58:25 DEBUG: Running main loop"
    prose_data = "This is a simple text document containing some thoughts about the universe and how context compression works."
    
    assert detect_type(python_code) == "code"
    assert detect_type(log_data) == "log"
    assert detect_type(prose_data) == "prose"

def test_chunk_text():
    sample_text = "Paragraph 1 is here.\n\nParagraph 2 is here. It has more detail.\n\nParagraph 3 is also here."
    chunks = chunk_text(sample_text)
    
    assert len(chunks) > 0
    assert chunks[0]["index"] == 0
    assert "Paragraph 1" in chunks[0]["text"]

def test_dedup_chunks():
    # Construct identical and unique chunks
    chunks = [
        {"index": 0, "text": "This is a unique chunk that should definitely be kept in the list."},
        {"index": 1, "text": "This is a unique chunk that should definitely be kept in the list."}, # exact duplicate
        {"index": 2, "text": "Something completely different and independent of the first chunk."}
    ]
    
    deduped = dedup_chunks(chunks, threshold=0.9)
    # The duplicate should be dropped
    assert len(deduped) == 2
    assert deduped[0]["index"] == 0
    assert deduped[1]["index"] == 2

def test_strip_filler():
    chunk = (
        "def process(x):\n"
        "    # This is a very useless verbose boilerplate filler comment block\n"
        "    y = x * 100\n"
        "    return y"
    )
    # High stripping (keep only 50% of non-empty lines)
    stripped = strip_filler(chunk, keep_ratio=0.5)
    
    # Critical syntax (def, return, assignment) should be preserved due to floor protection
    assert "def process" in stripped
    assert "return y" in stripped
    assert "y = x * 100" in stripped

def test_compress():
    raw_text = (
        "def format_timestamp(t):\n"
        "    return str(t)\n\n"
        "def format_timestamp(t):\n"  # Duplicate function
        "    return str(t)\n\n"
        "# Unimportant filler line that does nothing\n"
        "x = 42\n"
    )
    result = compress(raw_text, similarity_threshold=0.9, keep_ratio=0.8)
    
    assert "compressed_text" in result
    assert result["raw_tokens"] > 0
    assert result["compressed_tokens"] < result["raw_tokens"]
    assert result["compression_ratio"] > 0
