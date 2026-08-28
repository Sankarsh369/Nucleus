FROM python:3.12-slim

WORKDIR /workspace

# Install curl for health check and general utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Warm up SentenceTransformers and tiktoken BPE caches at Docker build time
RUN python scripts/download_cache.py

ENV DOCKER_ENV=true
# Default port for local `docker run`; most PaaS providers (Railway, Cloud Run,
# Render...) inject their own $PORT at runtime and the CMD below honors it.
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD sh -c "curl -f http://localhost:${PORT}/health" || exit 1

# Start FastAPI server, binding to whatever $PORT the host platform provides
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
