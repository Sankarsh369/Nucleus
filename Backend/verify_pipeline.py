import json
import os
import sys
import logging

# Add current directory to path so we can import app
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.compressor import compress
from app.validator import validate

# Set up logging to stdout
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nucleus.verify_pipeline")

def run_verification():
    logger.info("=" * 60)
    logger.info("NUCLEUS BACKEND MULTIMODAL VERIFICATION PIPELINE")
    logger.info("=" * 60)
    
    # Check PyTorch & CUDA Status
    try:
        import torch
        cuda_available = torch.cuda.is_available()
        logger.info(f"PyTorch Version: {torch.__version__}")
        logger.info(f"CUDA Available:  {cuda_available}")
        if cuda_available:
            logger.info(f"GPU Name:        {torch.cuda.get_device_name(0)}")
        else:
            logger.info("GPU Name:        N/A (Using CPU)")
    except ImportError:
        logger.info("PyTorch Version: Not Installed (Using CPU Fallback)")
        logger.info("CUDA Available:  False")
        logger.info("GPU Name:        N/A (Using CPU)")
    logger.info("-" * 60)
    
    # Define verification runs (type, file path)
    datasets = [
        {"type": "code", "path": "sample_data/long_codebase.txt"},
        {"type": "log", "path": "sample_data/sample_logs.txt"},
        {"type": "prose", "path": "sample_data/sample_prose.txt"}
    ]
    
    pipeline_success = True
    compression_ratios = []
    
    # 1. Run compression checks across Code, Logs, and Prose
    for data in datasets:
        logger.info(f"Processing content type: {data['type'].upper()} ({data['path']})")
        if not os.path.exists(data['path']):
            logger.error(f"Missing sample file: {data['path']}")
            pipeline_success = False
            continue
            
        with open(data['path'], "r", encoding="utf-8") as f:
            text = f.read()
            
        result = compress(text)
        compression_ratios.append(result["compression_ratio"])
        tokens_saved = result["raw_tokens"] - result["compressed_tokens"]
        cost_saved_usd = max(0.0, tokens_saved * (3.00 / 1_000_000))
        
        logger.info(f"[{data['type'].upper()}] Raw Tokens:        {result['raw_tokens']}")
        logger.info(f"[{data['type'].upper()}] Compressed Tokens:   {result['compressed_tokens']}")
        logger.info(f"[{data['type'].upper()}] Compression Ratio:   {result['compression_ratio']}% reduction")
        logger.info(f"[{data['type'].upper()}] Cost Saved (Sonnet): ${cost_saved_usd:.6f}")
        
        if result["compression_ratio"] >= 70.0:
            logger.info(f"SUCCESS: Compression target met for {data['type'].upper()}!")
        else:
            logger.warning(f"WARNING: Compression target NOT met for {data['type'].upper()} (under 70%).")
            pipeline_success = False
        logger.info("-" * 60)
        
    # 2. Run QA Answer Validation (on Code codebase)
    logger.info("Running reasoning validation on CODE QA pairs...")
    qa_path = "sample_data/qa_pairs.json"
    code_path = "sample_data/long_codebase.txt"
    
    accuracy_met = False
    if os.path.exists(qa_path) and os.path.exists(code_path):
        with open(qa_path, "r", encoding="utf-8") as f:
            qa_pairs = json.load(f)
        with open(code_path, "r", encoding="utf-8") as f:
            raw_text = f.read()
            
        # Get compressed version
        result = compress(raw_text)
        
        # Validate QA pairs
        validation_res = validate(raw_text, result["compressed_text"], qa_pairs)
        
        logger.info(f"Accuracy Retained:   {validation_res['accuracy_retained']}%")
        logger.info(f"Validation Provider: {validation_res['providerUsed']}")
        logger.info(f"Latency Speedup:     {validation_res['latency_speedup_ratio']}x")
        logger.info(f"Speedup Estimated:   {validation_res['latency_speedup_is_estimated']}")
        logger.info("=" * 60)
        
        if validation_res["accuracy_retained"] is not None and validation_res["accuracy_retained"] >= 95.0:
            logger.info("SUCCESS: Downstream accuracy retention target (95%+) met!")
            accuracy_met = True
        else:
            logger.warning("WARNING: Accuracy retention below target (95.0%).")
            pipeline_success = False
    else:
        logger.error("Missing QA data or Code file for reasoning validation check.")
        pipeline_success = False
        
    # Enforce aggregate pipeline gates
    all_compression_success = len(compression_ratios) == len(datasets) and all(r >= 70.0 for r in compression_ratios)
    
    logger.info("=" * 60)
    if all_compression_success and accuracy_met:
        logger.info("OVERALL PIPELINE STATUS: VERIFIED SUCCESSFUL")
        sys.exit(0)
    else:
        logger.error("OVERALL PIPELINE STATUS: FAILED (Targets not fully met across Code, Logs, and Prose)")
        sys.exit(1)

if __name__ == "__main__":
    run_verification()
