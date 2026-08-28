import os
import httpx
import logging

# Initialize structured logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("nucleus.cache_downloader")

def download_cache():
    logger.info("=" * 60)
    logger.info("NUCLEUS CACHE PRE-DOWNLOAD TOOL")
    logger.info("=" * 60)
    
    # Create cache directory at Backend/cache
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache_dir = os.path.join(base_dir, "cache")
    os.makedirs(cache_dir, exist_ok=True)
    logger.info(f"Cache directory: {cache_dir}")
    
    # 1. Download tiktoken cl100k_base BPE file
    tiktoken_url = "https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken"
    tiktoken_dest = os.path.join(cache_dir, "cl100k_base.tiktoken")
    
    if os.path.exists(tiktoken_dest):
        logger.info("-> cl100k_base.tiktoken already cached.")
    else:
        logger.info(f"-> Downloading cl100k_base.tiktoken from {tiktoken_url}...")
        try:
            with httpx.Client(timeout=120.0) as client:
                response = client.get(tiktoken_url)
                response.raise_for_status()
                with open(tiktoken_dest, "wb") as f:
                    f.write(response.content)
            logger.info(f"SUCCESS: Cached BPE file at {tiktoken_dest} ({len(response.content) // 1024} KB)")
        except Exception as e:
            logger.error(f"ERROR: Failed to download tiktoken file: {e}")
            
    # 2. Warm up Hugging Face SentenceTransformer cache programmatically
    logger.info("-" * 60)
    logger.info("-> Pre-downloading and warming SentenceTransformers 'all-MiniLM-L6-v2' model cache...")
    try:
        from sentence_transformers import SentenceTransformer
        # Instantiating the model automatically fetches and caches model weights
        model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("SUCCESS: SentenceTransformers 'all-MiniLM-L6-v2' is fully cached locally.")
    except Exception as e:
        logger.warning(
            f"WARNING: Failed to programmatically warm SentenceTransformers cache: {e}.\n"
            f"If you are currently offline, the engine will gracefully degrade to Bag-of-Words similarity fallback."
        )
    logger.info("=" * 60)

if __name__ == "__main__":
    download_cache()
