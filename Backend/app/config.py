import os
from dotenv import load_dotenv

# Load environmental variables from .env file
load_dotenv()

# API Keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Default Models
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-3-5-haiku-20241022")

# Embedding Configuration
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
SIMILARITY_THRESHOLD = 0.92
KEEP_RATIO = 0.30

# Rate Limiting & Retries
MAX_RETRIES = 3
INITIAL_BACKOFF = 2.0  # seconds

# Context-window ceiling for the embedding model above. all-MiniLM-L6-v2
# silently truncates any single input beyond 256 tokens instead of erroring,
# which would make similarity/dedup checks on longer chunks silently wrong.
EMBEDDING_MAX_TOKENS = 256

# Maximum characters accepted per /compress request.
MAX_INPUT_CHARS = 200_000

# Optional API key for header checking (X-API-Key)
NUCLEUS_API_KEY = os.getenv("NUCLEUS_API_KEY", "")
