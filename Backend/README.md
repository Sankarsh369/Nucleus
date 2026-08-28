# Nucleus Backend - Context Compression Engine

Nucleus is an ultra-low-resource context compression engine designed to shrink LLM prompts by over 70% while maintaining >95% reasoning accuracy, enabling rapid, cost-effective inference on large codebases, customer logs, and prose contexts.

---

## 📋 Prerequisites
Ensure you have Python 3.10+ installed on your machine.

---

## ⚙️ 1. Environment Setup

If you haven't already set up the virtual environment, run the following commands:

```powershell
# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install minimalist local dependencies
pip install -r requirements.txt
```

---

## 💾 2. Offline Mode Cache Download (Optional)

To enable 100% offline local token counting without fetching tiktoken files from Azure at request time:

```powershell
# Download cl100k_base.tiktoken vocab file to cache/ folder
python download_cache.py
```
*Note: If this download fails or times out due to a slow network, the engine automatically degrades gracefully to a regex-based character token estimator fallback, preventing any server crashes.*

---

## 🧪 3. Running Unit Tests

Execute the test suite using `pytest`. This verifies chunking boundaries, semantic deduplication, comment stripping, floor protection, and similarity calculations.

```powershell
# Run the test suite
python -m pytest
```

Expected output:
```
============================== 7 passed in 0.06s ==============================
```

---

## 📊 4. Running the Verification Pipeline

To test context compression on the sample dataset (`sample_data/long_codebase.txt`) and print all judged metrics (compression ratio, QA retention, USD cost savings, and latency speedups):

```powershell
python verify_pipeline.py
```

Expected output:
```
============================================================
NUCLEUS BACKEND VERIFICATION PIPELINE
============================================================
...
Compression Results:
Raw Tokens:          1274
Compressed Tokens:   302
Compression Ratio:   76.3% reduction
Stage 2 Provider:    stage1-only
Cost Saved (Sonnet): $0.002916
------------------------------------------------------------
Running QA answer validation...
...
Accuracy Retained:   100.0%
Validation Provider: mock
Latency Speedup:     1.85x
============================================================
SUCCESS: Target compression ratio (>70%) met!
SUCCESS: Target accuracy retention (95%+) met!
============================================================
```

---

## 🌐 5. Running the FastAPI Server

To start the local REST API server:

```powershell
# Run the API server
uvicorn app.main:app --reload
```

The API will be available at:
- **Base URL**: `http://127.0.0.1:8000`
- **Interactive Documentation (Swagger)**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check**: `http://127.0.0.1:8000/health`

---

## 📡 6. Testing API Endpoints

You can verify the `/compress` endpoint using a client (like `curl` or Postman):

```bash
curl -X POST "http://127.0.0.1:8000/compress" \
     -H "Content-Type: application/json" \
     -d '{
       "text": "def calculate(x):\n    # boilerplate comment\n    return x * 42",
       "qa_pairs": [
         {
           "question": "What number is the input multiplied by?"
         }
       ]
     }'
```
