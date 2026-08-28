import os
import re
import math
from collections import Counter
from typing import Optional, List, Dict
from app.config import EMBEDDING_MODEL_NAME, SIMILARITY_THRESHOLD, KEEP_RATIO
from app.ingestion import chunk_text, count_tokens

class MockModel:
    """Lightweight fallback used when the real embedding model can't (or shouldn't) load."""
    def encode(self, sentences, **kwargs):
        import random
        fake_embs = []
        for s in sentences:
            val = sum(ord(c) * (i + 1) for i, c in enumerate(s))
            random.seed(val)
            fake_embs.append([random.uniform(-1.0, 1.0) for _ in range(384)])
        return fake_embs

_model = None

def get_model():
    """
    Lazy initialization of SentenceTransformer to ensure fast startup
    and clean CPU fallback if CUDA is not available/setup is in progress.

    Set NUCLEUS_FORCE_MOCK_EMBEDDINGS=true to skip loading torch/
    sentence-transformers entirely -- useful on memory-constrained hosts
    (e.g. Render's free 512MB tier), where loading the real model can get
    the process OOM-killed before it ever binds a port, rather than fail
    with a catchable exception. The app still works fully in this mode;
    Stage 2 semantic dedup falls back to the bag-of-words heuristic below.
    """
    global _model
    if _model is None:
        if os.getenv("NUCLEUS_FORCE_MOCK_EMBEDDINGS", "").lower() in ("1", "true", "yes"):
            print("[Nucleus Backend] NUCLEUS_FORCE_MOCK_EMBEDDINGS set - skipping torch/sentence-transformers load.")
            _model = MockModel()
            return _model
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"[Nucleus Backend] Loading embedding model on device: {device}")
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer(EMBEDDING_MODEL_NAME, device=device)
        except Exception as e:
            print(f"[Nucleus Backend] Warning: Failed to load sentence-transformers/torch: {e}")
            _model = MockModel()
    return _model

def dot_product(v1, v2):
    return sum(x * y for x, y in zip(v1, v2))

def magnitude(v):
    return math.sqrt(sum(x * x for x in v))

def cosine_similarity_pure(v1, v2):
    mag1 = magnitude(v1)
    mag2 = magnitude(v2)
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot_product(v1, v2) / (mag1 * mag2)

def stem_word(w: str) -> str:
    w = w.lower().strip()
    for suffix in ('ing', 'ed', 'es', 'ly', 's'):
        if w.endswith(suffix) and len(w) > len(suffix) + 2:
            return w[:-len(suffix)]
    return w

# Synonym expansion dictionary for technical keywords
SYNONYMS = {
    "exception": "error", "error": "exception",
    "pool": "connection", "connection": "pool",
    "agreed": "decided", "decided": "agreed",
    "limit": "max", "max": "limit",
    "raise": "throw", "throw": "raise"
}

def get_word_weight(w: str) -> float:
    w_clean = w.lower().strip()
    # High weight for code variables, proper exceptions, numbers
    if "_" in w_clean or any(c.isdigit() for c in w_clean):
        return 3.0
    if w_clean in {"keyerror", "valueerror", "logger", "connection", "pool", "limit", "exception", "error"}:
        return 2.5
    return 1.0 + (len(w_clean) * 0.1) # longer words carry more semantic weight

def bag_of_words_similarity(t1: str, t2: str) -> float:
    """
    Computes weighted overlap coefficient similarity of word frequencies between two texts.
    Cleans structural stopwords, stems words, maps synonyms, and weights by word length/importance.
    Handles asymmetric length matches between direct vs conversational LLM responses.
    """
    t1_lower = t1.lower()
    t2_lower = t2.lower()
    
    stopwords = {
        'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'for', 'to', 'of', 'in', 'on', 'at', 'by', 
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'default', 
        'name', 'with', 'about', 'as', 'this', 'that', 'these', 'those', 'from', 'it', 'its'
    }
    
    raw_w1 = re.findall(r'\b\w+\b', t1_lower)
    raw_w2 = re.findall(r'\b\w+\b', t2_lower)
    
    words1 = [stem_word(w) for w in raw_w1 if w not in stopwords]
    words2 = [stem_word(w) for w in raw_w2 if w not in stopwords]
    
    if not words1 and not words2:
        return 1.0
    if not words1 or not words2:
        return 0.0
        
    # Replace synonyms with canonical keys for matching
    words1_canon = [SYNONYMS.get(w, w) for w in words1]
    words2_canon = [SYNONYMS.get(w, w) for w in words2]
    
    c1 = Counter(words1_canon)
    c2 = Counter(words2_canon)
    
    vocab = set(c1.keys()).union(c2.keys())
    
    intersection_sum = 0.0
    sum1 = 0.0
    sum2 = 0.0
    
    for w in vocab:
        w_weight = get_word_weight(w)
        intersection_sum += min(c1.get(w, 0), c2.get(w, 0)) * w_weight
        sum1 += c1.get(w, 0) * w_weight
        sum2 += c2.get(w, 0) * w_weight
        
    min_sum = min(sum1, sum2)
    if min_sum == 0.0:
        return 0.0
        
    return float(intersection_sum / min_sum)

# Disk-Persisted Embedding Cache setup
import os
import json
EMBEDDING_CACHE_FILE = os.path.join("cache", "embeddings_cache.json")
DISK_EMBEDDING_CACHE = {}

if os.path.exists(EMBEDDING_CACHE_FILE):
    try:
        with open(EMBEDDING_CACHE_FILE, "r") as f:
            DISK_EMBEDDING_CACHE = json.load(f)
    except Exception as e:
        print(f"[Nucleus Backend] Warning: Failed to load disk embedding cache: {e}")

def dedup_chunks(chunks: list[dict], threshold: float = SIMILARITY_THRESHOLD) -> list[dict]:
    """
    Remove semantic redundancy across chunks using cosine similarity of embeddings.
    Integrates persistent disk cache to skip sentence-transformers execution on restarts.
    """
    if not chunks or len(chunks) <= 1:
        return chunks
        
    model = get_model()
    
    # If using MockModel, bypass neural embeddings and use pure bag-of-words similarity
    if model.__class__.__name__ == "MockModel":
        keep_idx = []
        for i, chunk in enumerate(chunks):
            if not keep_idx:
                keep_idx.append(i)
                continue
            
            sims = [bag_of_words_similarity(chunk["text"], chunks[k]["text"]) for k in keep_idx]
            if max(sims) < threshold:
                keep_idx.append(i)
        return [chunks[i] for i in keep_idx]
        
    # Standard neural model logic with Disk Embedding Caching and explicit 800-char truncation
    import hashlib
    texts = [c["text"] for c in chunks]
    embeddings = []
    uncached_texts = []
    uncached_indices = []
    
    for idx, text in enumerate(texts):
        # Truncate to 800 characters (approx 200 tokens) to ensure it stays below the model's 256-token context limit
        truncated_text = text if len(text) <= 800 else text[:800]
        text_hash = hashlib.sha256(truncated_text.encode("utf-8")).hexdigest()
        if text_hash in DISK_EMBEDDING_CACHE:
            embeddings.append(DISK_EMBEDDING_CACHE[text_hash])
        else:
            embeddings.append(None)
            uncached_texts.append(truncated_text)
            uncached_indices.append(idx)
            
    if uncached_texts:
        raw_embs = model.encode(uncached_texts)
        for raw_idx, emb in enumerate(raw_embs):
            orig_idx = uncached_indices[raw_idx]
            emb_list = emb.tolist() if hasattr(emb, "tolist") else list(emb)
            embeddings[orig_idx] = emb_list
            
            text_hash = hashlib.sha256(uncached_texts[raw_idx].encode("utf-8")).hexdigest()
            DISK_EMBEDDING_CACHE[text_hash] = emb_list
            
        # Write back to disk cache file
        try:
            os.makedirs(os.path.dirname(EMBEDDING_CACHE_FILE), exist_ok=True)
            with open(EMBEDDING_CACHE_FILE, "w") as f:
                json.dump(DISK_EMBEDDING_CACHE, f)
        except Exception as e:
            print(f"[Nucleus Backend] Warning: Failed to write disk embedding cache: {e}")
            
    keep_idx = []
    kept_embeddings = []
    
    for i, emb in enumerate(embeddings):
        if not kept_embeddings:
            keep_idx.append(i)
            kept_embeddings.append(emb)
            continue
            
        sims = [cosine_similarity_pure(emb, kept) for kept in kept_embeddings]
        if max(sims) < threshold:
            keep_idx.append(i)
            kept_embeddings.append(emb)
            
    return [chunks[i] for i in keep_idx]

def compute_pure_tfidf_scores(clean_lines: list[str]) -> dict:
    """
    Pure Python TF-IDF line scorer to remove scikit-learn dependency.
    """
    # Simple word tokenizer
    def tokenize(text):
        return re.findall(r'\b\w{2,}\b', text.lower())
        
    # Clean English stopwords
    stopwords = {
        'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 
        'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 
        'could', 'couldnt', 'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 
        'for', 'from', 'further', 'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'hed', 'hell', 
        'hes', 'her', 'here', 'heres', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'hows', 'i', 'id', 'ill', 
        'im', 'ive', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'lets', 'me', 'more', 'most', 'mustnt', 
        'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 
        'ourselves', 'out', 'over', 'own', 'same', 'shant', 'she', 'shed', 'shell', 'shes', 'should', 'shouldnt', 
        'so', 'some', 'such', 'than', 'that', 'thats', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 
        'there', 'theres', 'these', 'they', 'theyd', 'theyll', 'theyre', 'theyve', 'this', 'those', 'through', 'to', 
        'too', 'under', 'until', 'up', 'very', 'was', 'wasnt', 'we', 'wed', 'well', 'were', 'weve', 'werent', 'what', 
        'whats', 'when', 'whens', 'where', 'wheres', 'which', 'while', 'who', 'whos', 'whom', 'why', 'whys', 'with', 
        'wont', 'would', 'wouldnt', 'you', 'youd', 'youll', 'youre', 'youve', 'your', 'yours', 'yourself', 'yourselves'
    }
    
    # Tokenize all lines
    tokenized_lines = [tokenize(line) for line in clean_lines]
    
    # Document frequency (number of lines containing each word)
    doc_frequency = Counter()
    for tokens in tokenized_lines:
        unique_tokens = set(tokens)
        for token in unique_tokens:
            if token not in stopwords:
                doc_frequency[token] += 1
                
    num_lines = len(clean_lines)
    
    # Compute IDF
    idf = {}
    for word, count in doc_frequency.items():
        # standard smoothing formula
        idf[word] = math.log(1 + num_lines / (1 + count))
        
    line_scores = {}
    for idx, line in enumerate(clean_lines):
        tokens = tokenized_lines[idx]
        filtered_tokens = [t for t in tokens if t not in stopwords]
        
        if not filtered_tokens:
            line_scores[line] = 0.0
            continue
            
        # Term frequency in the line
        tf = Counter(filtered_tokens)
        total_tokens = len(filtered_tokens)
        
        scores = []
        for token in filtered_tokens:
            word_tf = tf[token] / total_tokens
            word_idf = idf.get(token, 0.0)
            scores.append(word_tf * word_idf)
            
        line_scores[line] = sum(scores) / len(scores)
        
    return line_scores

def redact_pii_content(text: str) -> tuple[str, list[str]]:
    """Scrub sensitive info like API keys, emails, and credit cards."""
    email_pattern = re.compile(r'\b[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+\b')
    card_pattern = re.compile(r'\b(?:\d[ -]?){13,16}\b')
    api_key_pattern = re.compile(
        r'\b(?:gsk_[a-zA-Z0-9]{40,60}|AIzaSy[a-zA-Z0-9_-]{30,45}|sk-ant-[a-zA-Z0-9_-]{80,120}|sk-[a-zA-Z0-9]{40,60})\b'
    )
    
    removed_items = []
    
    emails = email_pattern.findall(text)
    if emails:
        removed_items.extend([f"email: {e}" for e in emails])
    text = email_pattern.sub("[EMAIL_REDACTED]", text)
    
    cards = card_pattern.findall(text)
    if cards:
        removed_items.extend([f"card: {c}" for c in cards])
    text = card_pattern.sub("[CARD_REDACTED]", text)
    
    keys = api_key_pattern.findall(text)
    if keys:
        removed_items.extend([f"api_key: {k[:8]}..." for k in keys])
    text = api_key_pattern.sub("[API_KEY_REDACTED]", text)
    
    return text, removed_items

def deduplicate_json_logs(text: str) -> tuple[str, list[str]]:
    """Perform schema-aware field deduplication for structured JSON logs."""
    import json
    lines = text.splitlines()
    processed_lines = []
    seen_sigs = set()
    removed_items = []
    
    duplicate_count = 0
    stripped_keys = set()
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            processed_lines.append(line)
            continue
        try:
            if stripped.startswith("{") and stripped.endswith("}"):
                data = json.loads(stripped)
                if isinstance(data, dict):
                    keys_to_remove = {"timestamp", "time", "date", "thread", "pid", "process", "level", "logger", "hostname", "host"}
                    found_keys = keys_to_remove.intersection(data.keys())
                    stripped_keys.update(found_keys)
                    
                    cleaned_data = {k: v for k, v in data.items() if k not in keys_to_remove}
                    
                    sig = json.dumps(cleaned_data, sort_keys=True)
                    if sig in seen_sigs:
                        duplicate_count += 1
                        continue
                    seen_sigs.add(sig)
                    processed_lines.append(json.dumps(cleaned_data))
                else:
                    processed_lines.append(line)
            else:
                processed_lines.append(line)
        except Exception:
            processed_lines.append(line)
            
    if duplicate_count > 0:
        removed_items.append(f"duplicate_logs: {duplicate_count} lines")
    if stripped_keys:
        removed_items.append(f"stripped_keys: {', '.join(sorted(list(stripped_keys)))}")
        
    return "\n".join(processed_lines), removed_items

def protect_conversation_turns(text: str, num_recent_turns: int = 3) -> set:
    """Identify conversation turns and return global line indices of the recent turns to keep verbatim."""
    lines = text.splitlines()
    turn_indices = []
    turn_patterns = [
        re.compile(r'^\s*#?\s*(User|Assistant|Developer|Dev|Agent|System|Client|Server)\s*[A-Z]?\b', re.IGNORECASE),
        re.compile(r'^\s*#?\s*[A-Za-z]+ \[\d{2}:\d{2}\s*(?:AM|PM)?\]', re.IGNORECASE)
    ]
    
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if any(p.match(stripped) for p in turn_patterns):
            turn_indices.append(idx)
            
    protected_indices = set()
    if len(turn_indices) >= num_recent_turns:
        start_idx = turn_indices[-num_recent_turns]
        for idx in range(start_idx, len(lines)):
            protected_indices.add(idx)
    elif turn_indices:
        start_idx = turn_indices[0]
        for idx in range(start_idx, len(lines)):
            protected_indices.add(idx)
            
    return protected_indices

def strip_filler_with_diff(
    chunk_text: str,
    keep_ratio: float = KEEP_RATIO,
    floor_threshold: float = 0.6,
    protected_local_indices: Optional[set] = None
) -> tuple:
    """
    Strips the least informative lines based on TF-IDF scoring and returns
    both the trimmed text and keep/drop decisions with explanations.
    """
    lines = chunk_text.splitlines()
    decisions = {}
    
    if not lines:
        return "", {}
        
    if len(lines) <= 1:
        stripped = lines[0].strip()
        reason = "empty-line" if not stripped else "kept-content"
        return chunk_text, {0: (True, reason)}
        
    for i, line in enumerate(lines):
        if not line.strip():
            decisions[i] = (True, "empty-line")
            
    clean_lines_info = [(i, line.strip()) for i, line in enumerate(lines) if line.strip()]
    if len(clean_lines_info) < 2:
        for i, line in enumerate(lines):
            if i not in decisions:
                decisions[i] = (True, "kept-content")
        return chunk_text, decisions
        
    clean_lines = [item[1] for item in clean_lines_info]
    
    try:
        line_scores = compute_pure_tfidf_scores(clean_lines)
    except Exception:
        line_scores = {line: float(len(line.split())) for line in clean_lines}
        
    code_pattern = re.compile(
        r'(\bdef\b|\bclass\b|\breturn\b|\bimport\b|\bfrom\b|=|\{|\}|\[|\]|\(|\))'
    )
    numeric_pattern = re.compile(r'\b\d+(\.\d+)?\b')
    named_entity_pattern = re.compile(r'\b[A-Z][a-zA-Z0-9_]+\b')
    comment_pattern = re.compile(r'^\s*(#|//|/\*|\*)')
    
    signature_pattern = re.compile(
        r'^\s*(def\s+\w+|class\s+\w+|async\s+def\s+\w+|from\s+\w+\s+import|import\s+\w+)'
    )
    raise_pattern = re.compile(r'^\s*(raise\s+\w+|except\s+\w+|try\b)')
    dev_chat_pattern = re.compile(r'^\s*#\s*(Developer [A-Z]|Dev [A-Z]|\b[A-Za-z]+ \[\d{2}:\d{2}\s*(AM|PM)\])', re.IGNORECASE)
    
    hard_keep_indices = set()
    scored_lines = []
    
    for i, line in clean_lines_info:
        if protected_local_indices and i in protected_local_indices:
            hard_keep_indices.add(i)
            decisions[i] = (True, "protected-conversation")
            continue
            
        if signature_pattern.match(line):
            hard_keep_indices.add(i)
            decisions[i] = (True, "protected-signature")
            continue
            
        if raise_pattern.match(line):
            hard_keep_indices.add(i)
            decisions[i] = (True, "protected-exception")
            continue
            
        if dev_chat_pattern.match(line):
            hard_keep_indices.add(i)
            decisions[i] = (True, "protected-conversation")
            continue
            
        base_score = line_scores.get(line, 0.0)
        
        boost = 0.0
        if comment_pattern.match(line):
            boost -= 0.5
            if numeric_pattern.search(line) or '?' in line:
                boost += 1.2
        else:
            if code_pattern.search(line):
                boost += 0.3
            if numeric_pattern.search(line):
                boost += 0.5
            if named_entity_pattern.search(line):
                boost += 0.4
                
        final_score = base_score + boost
        scored_lines.append((i, line, final_score))
        
    scored_lines.sort(key=lambda x: x[2])
    
    total_non_empty = len(clean_lines)
    num_to_keep = max(1, int(total_non_empty * keep_ratio))
    
    selected_indices = set(hard_keep_indices)
    remaining_budget = max(0, num_to_keep - len(selected_indices))
    
    if remaining_budget > 0:
        for item in scored_lines[-remaining_budget:]:
            idx = item[0]
            selected_indices.add(idx)
            if idx not in decisions:
                decisions[idx] = (True, "kept-content")
                
    for idx, line, score in scored_lines:
        if score >= floor_threshold:
            selected_indices.add(idx)
            if idx not in decisions:
                decisions[idx] = (True, "kept-content")
                
    for idx, line, score in scored_lines:
        if idx not in selected_indices:
            decisions[idx] = (False, "low-value")
            
    final_lines = []
    for i, line in enumerate(lines):
        if not line.strip() or i in selected_indices:
            final_lines.append(line)
            
    return "\n".join(final_lines), decisions

def strip_filler(chunk_text: str, keep_ratio: float = KEEP_RATIO, floor_threshold: float = 0.6) -> str:
    """Strips the least informative lines using the core diff-supporting logic to preserve backward compatibility."""
    trimmed, _ = strip_filler_with_diff(chunk_text, keep_ratio, floor_threshold)
    return trimmed

def compress(
    raw_text: str,
    similarity_threshold: float = SIMILARITY_THRESHOLD,
    keep_ratio: float = KEEP_RATIO,
    aggressiveness: Optional[float] = None,
    target_token_budget: Optional[int] = None,
    is_conversation: bool = False,
    redact_pii: bool = False
) -> dict:
    """
    Compress the context using semantic deduplication and adaptive filler stripping,
    supporting target token budgets, conversational constraints, PII scrubs, and structured diff output.
    """
    if not raw_text.strip():
        return {
            "compressed_text": "",
            "raw_tokens": 0,
            "compressed_tokens": 0,
            "compression_ratio": 0.0,
            "plain_english_summary": "Empty input text.",
            "structured_diff": [],
            "stage_breakdown": [],
            "compression_trace": []
        }
        
    compression_trace = []
    running_text = raw_text
    tokens_before = count_tokens(running_text)
    
    # Stage 0: PII Redaction
    pii_removed = []
    if redact_pii:
        running_text, pii_removed = redact_pii_content(running_text)
        tokens_after = count_tokens(running_text)
        compression_trace.append({
            "stage": "pii_redaction",
            "description": f"Scrubbed sensitive items: {len(pii_removed)} patterns matched.",
            "removed_items": pii_removed if pii_removed else None,
            "tokens_before": tokens_before,
            "tokens_after": tokens_after
        })
        tokens_before = tokens_after
        
    # Stage 0.5: Schema-Aware JSON log deduplication
    log_removed = []
    from app.ingestion import detect_type
    is_log = detect_type(running_text) == "log"
    if is_log:
        running_text, log_removed = deduplicate_json_logs(running_text)
        tokens_after = count_tokens(running_text)
        compression_trace.append({
            "stage": "json_log_dedup",
            "description": "Deduplicated JSON structured log lines and stripped metadata fields.",
            "removed_items": log_removed if log_removed else None,
            "tokens_before": tokens_before,
            "tokens_after": tokens_after
        })
        tokens_before = tokens_after
        
    # Resolve aggressiveness override
    if aggressiveness is not None:
        keep_ratio = 1.0 - aggressiveness
        
    # Identify conversation protection turns
    protected_global_indices = protect_conversation_turns(running_text) if is_conversation else set()
    
    raw_tokens = count_tokens(raw_text)
    
    # Stage A: Chunking
    chunks = chunk_text(running_text)
    chunks_count_before = len(chunks)
    
    # Stage B: Deduplication
    deduped_chunks = dedup_chunks(chunks, threshold=similarity_threshold)
    deduped_indices = {c["index"] for c in deduped_chunks}
    deduped_text = "\n\n".join([c["text"] for c in deduped_chunks])
    tokens_after_dedup = count_tokens(deduped_text)
    
    removed_chunks = [f"chunk {c['index']}" for c in chunks if c["index"] not in deduped_indices]
    compression_trace.append({
        "stage": "chunk_deduplication",
        "description": f"Removed {chunks_count_before - len(deduped_chunks)} chunks out of {chunks_count_before} that were similar to earlier chunks.",
        "removed_items": removed_chunks if removed_chunks else None,
        "tokens_before": tokens_before,
        "tokens_after": tokens_after_dedup
    })
    tokens_before = tokens_after_dedup
    
    # Stage C: Adaptive Budget Stripping
    if target_token_budget is not None and raw_tokens > 0:
        best_ratio_result = None
        current_keep_ratio = max(0.05, min(0.95, target_token_budget / raw_tokens))
        floor_threshold = 0.6
        
        # Binary-search style sweeps to hit target token budget
        for step in range(5):
            trimmed_chunks = []
            for c in deduped_chunks:
                protected_local_indices = {
                    local_idx for local_idx, global_idx in enumerate(c["line_indices"])
                    if global_idx in protected_global_indices
                }
                trimmed_text, _ = strip_filler_with_diff(
                    c["text"],
                    keep_ratio=current_keep_ratio,
                    floor_threshold=floor_threshold,
                    protected_local_indices=protected_local_indices
                )
                trimmed_chunks.append(trimmed_text)
                
            temp_compressed = "\n\n".join(trimmed_chunks)
            temp_tokens = count_tokens(temp_compressed)
            
            if temp_tokens <= target_token_budget:
                best_ratio_result = (current_keep_ratio, floor_threshold, temp_compressed, temp_tokens)
                current_keep_ratio = min(0.95, current_keep_ratio + 0.05)
            else:
                current_keep_ratio = max(0.05, current_keep_ratio - 0.08)
                floor_threshold += 0.15
                
        if best_ratio_result:
            keep_ratio, floor_threshold, _, _ = best_ratio_result
        else:
            keep_ratio = 0.05
            floor_threshold = 1.8
            
    floor_threshold_val = 0.6
    current_keep_ratio = keep_ratio
    max_attempts = 10
    best_result = None
    
    for attempt in range(max_attempts):
        trimmed_chunks = []
        chunk_decisions = {}
        
        for c in deduped_chunks:
            protected_local_indices = {
                local_idx for local_idx, global_idx in enumerate(c["line_indices"])
                if global_idx in protected_global_indices
            }
            trimmed_text, decisions = strip_filler_with_diff(
                c["text"],
                keep_ratio=current_keep_ratio,
                floor_threshold=floor_threshold_val,
                protected_local_indices=protected_local_indices
            )
            trimmed_chunks.append({
                "index": c["index"],
                "text": trimmed_text
            })
            chunk_decisions[c["index"]] = decisions
            
        trimmed_chunks.sort(key=lambda x: x["index"])
        compressed_text = "\n\n".join([c["text"] for c in trimmed_chunks])
        compressed_tokens = count_tokens(compressed_text)
        
        if raw_tokens > 0:
            ratio = round((1 - (compressed_tokens / raw_tokens)) * 100, 1)
        else:
            ratio = 0.0
            
        current_result = {
            "compressed_text": compressed_text,
            "raw_tokens": raw_tokens,
            "compressed_tokens": compressed_tokens,
            "compression_ratio": ratio,
            "chunk_decisions": chunk_decisions,
            "floor_threshold": floor_threshold_val,
            "keep_ratio": current_keep_ratio
        }
        
        if best_result is None or current_result["compression_ratio"] > best_result["compression_ratio"]:
            if target_token_budget is None or current_result["compressed_tokens"] <= target_token_budget:
                best_result = current_result
                
        if target_token_budget is not None:
            if compressed_tokens <= target_token_budget:
                break
        else:
            if ratio >= 70.0:
                break
                
        floor_threshold_val += 0.15
        current_keep_ratio = max(0.15, current_keep_ratio - 0.03)
        
    if best_result is None:
        best_result = current_result
        
    # Reconstruct Structured Diff mapping
    original_lines = raw_text.splitlines()
    structured_diff = []
    global_decisions = {}
    
    for c in chunks:
        c_idx = c["index"]
        line_indices = c["line_indices"]
        
        if c_idx not in deduped_indices:
            for idx in line_indices:
                global_decisions[idx] = (False, "duplicate")
        else:
            decisions = best_result["chunk_decisions"].get(c_idx, {})
            for local_idx, global_idx in enumerate(line_indices):
                if local_idx in decisions:
                    global_decisions[global_idx] = decisions[local_idx]
                else:
                    global_decisions[global_idx] = (True, "kept-content")
                    
    for idx, line in enumerate(original_lines):
        kept, reason = global_decisions.get(idx, (True, "kept-content"))
        if not line.strip():
            kept, reason = True, "empty-line"
        structured_diff.append({
            "line": line,
            "kept": kept,
            "reason": reason
        })
        
    duplicate_lines_count = sum(1 for item in structured_diff if not item["kept"] and item["reason"] == "duplicate")
    low_value_lines_count = sum(1 for item in structured_diff if not item["kept"] and item["reason"] == "low-value")
    
    summary = f"Removed {duplicate_lines_count} duplicate lines and {low_value_lines_count} low-value lines, reducing context size by {best_result['compression_ratio']}%."
    if duplicate_lines_count == 0 and low_value_lines_count == 0:
        summary = "No lines were removed during context compression."
        
    # Stage breakdown token counts
    stage_breakdown = [
        {"stage": "raw", "tokens": raw_tokens, "description": "Original raw input text size"},
        {"stage": "deduplicated", "tokens": tokens_after_dedup, "description": "Size after semantic chunk deduplication"},
        {"stage": "final", "tokens": best_result["compressed_tokens"], "description": "Final output size after budget & layout fitting"}
    ]
    
    # Trace for Sweeps & Final Stripping
    if target_token_budget is not None:
        compression_trace.append({
            "stage": "budget_fit_sweep",
            "description": f"Dynamically searched parameters to fit within budget of {target_token_budget} tokens.",
            "removed_items": [f"adjusted keep_ratio to {best_result['keep_ratio']:.2f}", f"adjusted floor_threshold to {best_result['floor_threshold']:.2f}"],
            "tokens_before": tokens_before,
            "tokens_after": best_result["compressed_tokens"]
        })
        tokens_before = best_result["compressed_tokens"]
        
    low_value_lines = []
    for idx, item in enumerate(structured_diff):
        if not item["kept"] and item["reason"] == "low-value":
            low_value_lines.append(f"line {idx}: {item['line'][:20]}...")
            
    if len(low_value_lines) > 20:
        low_value_lines = low_value_lines[:20] + [f"... and {len(low_value_lines) - 20} more lines"]
        
    compression_trace.append({
        "stage": "filler_stripping",
        "description": "Stripped low-value content lines using TF-IDF density scores.",
        "removed_items": low_value_lines if low_value_lines else None,
        "tokens_before": tokens_before,
        "tokens_after": best_result["compressed_tokens"]
    })
    
    return {
        "compressed_text": best_result["compressed_text"],
        "raw_tokens": best_result["raw_tokens"],
        "compressed_tokens": best_result["compressed_tokens"],
        "compression_ratio": best_result["compression_ratio"],
        "plain_english_summary": summary,
        "structured_diff": structured_diff,
        "stage_breakdown": stage_breakdown,
        "compression_trace": compression_trace
    }
