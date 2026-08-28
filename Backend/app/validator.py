import time
import logging
from app.llm_client import ask_llm
from app.compressor import get_model, cosine_similarity_pure, bag_of_words_similarity

# Initialize logger
logger = logging.getLogger("nucleus.validator")

def semantic_similarity(text1: str, text2: str) -> float:
    """
    Compute cosine similarity between the embeddings of two texts,
    mapped to a 0-100 range.
    Uses bag_of_words_similarity as a robust fallback in mock mode.
    """
    if not text1.strip() or not text2.strip():
        if not text1.strip() and not text2.strip():
            return 100.0
        return 0.0
        
    model = get_model()
    if model.__class__.__name__ == "MockModel":
        similarity = bag_of_words_similarity(text1, text2)
    else:
        embeddings = model.encode([text1, text2])
        similarity = cosine_similarity_pure(embeddings[0], embeddings[1])
    
    # Map cosine similarity [-1, 1] to [0, 100] range
    return max(0.0, float(similarity)) * 100.0

def validate(raw_text: str, compressed_text: str, qa_pairs: list[dict]) -> dict:
    """
    Compares the QA responses of target LLM on raw context vs compressed context.
    Scores accuracy retention and tracks inference latency.
    """
    if not qa_pairs:
        return {"accuracy_retained": None, "providerUsed": None, "latency_speedup_ratio": None, "validation_details": []}
        
    scores = []
    providers = []
    details_list = []
    total_raw_time = 0.0
    total_compressed_time = 0.0
    
    logger.info(f"Running accuracy validation on {len(qa_pairs)} QA pairs...")
    
    for i, pair in enumerate(qa_pairs):
        question = pair.get("question")
        if not question:
            continue
            
        logger.info(f"QA Pair {i+1} - Question: {question[:60]}...")
        
        # Time the raw LLM call
        start_raw = time.perf_counter()
        answer_raw, p_raw = ask_llm(raw_text, question)
        elapsed_raw = time.perf_counter() - start_raw
        total_raw_time += elapsed_raw
        
        # Time the compressed LLM call
        start_comp = time.perf_counter()
        answer_compressed, p_comp = ask_llm(compressed_text, question)
        elapsed_comp = time.perf_counter() - start_comp
        total_compressed_time += elapsed_comp
        
        logger.info(f"-> Raw Answer ({p_raw}) [{elapsed_raw:.2f}s]: {answer_raw[:80]}...")
        logger.info(f"-> Compressed Answer ({p_comp}) [{elapsed_comp:.2f}s]: {answer_compressed[:80]}...")
        
        # Compute similarity
        similarity = semantic_similarity(answer_raw, answer_compressed)
        scores.append(similarity)
        providers.append(p_comp)
        
        details_list.append({
            "question": question,
            "answer_raw": answer_raw,
            "answer_compressed": answer_compressed,
            "match_score": round(similarity, 1)
        })
        
        logger.info(f"-> Match Score: {similarity:.1f}%")
        
    if not scores:
        return {"accuracy_retained": None, "providerUsed": None, "latency_speedup_ratio": None, "latency_speedup_is_estimated": None, "validation_details": []}
        
    avg_accuracy = sum(scores) / len(scores)
    # Most common provider used during the run
    provider_used = max(set(providers), key=providers.count) if providers else "mock"
    
    # Speedup ratio calculation (handling division by zero)
    speedup_ratio = 1.0
    is_estimated = False
    
    # If the provider is mock (simulated delay), flag it as estimated
    if provider_used == "mock":
        is_estimated = True
        
    if total_compressed_time > 0:
        speedup_ratio = round(total_raw_time / total_compressed_time, 2)
    else:
        is_estimated = True
        # Fallback to estimated theoretical speedup if mock returns instantly (safety check)
        raw_tokens = len(raw_text) // 4
        comp_tokens = len(compressed_text) // 4
        if comp_tokens > 0:
            speedup_ratio = round(raw_tokens / comp_tokens, 2)
            
    logger.info(f"Latency raw total: {total_raw_time:.2f}s | Latency compressed total: {total_compressed_time:.2f}s")
    logger.info(f"Calculated Latency Speedup: {speedup_ratio}x (Estimated: {is_estimated})")
    
    return {
        "accuracy_retained": round(avg_accuracy, 1),
        "providerUsed": provider_used,
        "latency_speedup_ratio": speedup_ratio,
        "latency_speedup_is_estimated": is_estimated,
        "validation_details": details_list
    }
