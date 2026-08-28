import re
from typing import List, Dict

def count_tokens(text: str, encoding_name: str = "cl100k_base") -> int:
    """
    Count the number of tokens in the given text using tiktoken.
    Falls back to local file load or character-count estimation if offline/not installed.
    """
    if not text:
        return 0
    try:
        import tiktoken
        import os
        try:
            # Locate local cache file if pre-downloaded
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            cache_path = os.path.join(base_dir, "cache", "cl100k_base.tiktoken")
            
            if os.path.exists(cache_path):
                # Instantiate encoding purely offline using BPE file
                mergeable_ranks = tiktoken.load.load_tiktoken_bpe(cache_path)
                encoding = tiktoken.Encoding(
                    name="cl100k_base",
                    pat_str=r"""(?i:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+""",
                    mergeable_ranks=mergeable_ranks,
                    special_tokens={
                        "<|endoftext|>": 100257,
                        "<|fim_prefix|>": 100258,
                        "<|fim_middle|>": 100259,
                        "<|fim_suffix|>": 100260,
                        "<|endofprompt|>": 100276
                    }
                )
            else:
                try:
                    encoding = tiktoken.get_encoding(encoding_name)
                except ValueError:
                    encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except Exception as e:
            # Handle offline socket/SSL/blob-access timeout issues
            print(f"[Ingestion] Warning: tiktoken online fetch failed ({e}). Using offline heuristic.")
            return max(1, len(text) // 4)
    except Exception:
        # Fallback if tiktoken package is not installed at all
        return max(1, len(text) // 4)

def detect_type(text: str) -> str:
    """
    Detect the content type (code, log, or prose) of the text.
    """
    lines = text.splitlines()
    if not lines:
        return "prose"
    
    # Log pattern: Starts with timestamp (e.g., 2026-08-01, 10:58:24, [INFO])
    log_pattern = re.compile(
        r'^(\[?\d{4}[-/]\d{2}[-/]\d{2}.*?\]?|'
        r'\[?\d{2}:\d{2}:\d{2}.*?\]?|'
        r'\[?(INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\]?\b\s*[:|]?)',
        re.IGNORECASE
    )
    log_lines = sum(1 for line in lines if log_pattern.match(line.strip()))
    if len(lines) >= 2 and (log_lines / len(lines)) > 0.25:
        return "log"
    
    # Code pattern: Common signatures for functions/classes/imports
    code_keywords = [
        r'^\s*def\s+\w+\b',          # python function
        r'^\s*class\s+\w+\b',        # python/js class
        r'^\s*import\s+.*from',      # python/js import
        r'^\s*from\s+\w+\s+import',   # python import
        r'^\s*function\s+\w*\(',     # javascript function
        r'^\s*const\s+\w+\s*=\s*',    # js variable/arrow function
        r'^\s*(public|private|protected)\s+(class|void|int|string|final|static)\b', # java/c# signatures
        r'^\s*#include\s+<',         # c/c++ include
    ]
    code_pattern = re.compile('|'.join(code_keywords))
    code_lines = sum(1 for line in lines if code_pattern.match(line))
    if code_lines > 2 or (len(lines) > 0 and (code_lines / len(lines)) > 0.05):
        return "code"
    
    return "prose"

def chunk_text(text: str) -> List[Dict]:
    """
    Split input text into semantically coherent chunks and keep track of original line indices.
    """
    if not text:
        return [{"index": 0, "text": "", "line_indices": []}]

    content_type = detect_type(text)
    lines = text.splitlines()
    chunks = []
    
    if content_type == "log":
        current_chunk = []
        current_indices = []
        current_size = 0
        max_chunk_size = 800
        
        log_start_pattern = re.compile(
            r'^(\[?\d{4}[-/]\d{2}[-/]\d{2}|'
            r'\[?\d{2}:\d{2}:\d{2}|'
            r'\[?(INFO|WARN|WARNING|ERROR|DEBUG|TRACE|FATAL)\]?\b)',
            re.IGNORECASE
        )
        
        for idx, line in enumerate(lines):
            if log_start_pattern.match(line.strip()) and current_size > max_chunk_size:
                chunks.append({
                    "index": len(chunks),
                    "text": "\n".join(current_chunk),
                    "line_indices": current_indices
                })
                current_chunk = []
                current_indices = []
                current_size = 0
            current_chunk.append(line)
            current_indices.append(idx)
            current_size += len(line) + 1
            
        if current_chunk:
            chunks.append({
                "index": len(chunks),
                "text": "\n".join(current_chunk),
                "line_indices": current_indices
            })
            
    elif content_type == "code":
        boundary_pattern = re.compile(
            r'^\s*(def\s+\w+|class\s+\w+|function\s+\w*|export\s+(const|let|var|function|class)|async\s+function|public\s+class|private\s+class|public\s+static|struct\s+\w+|enum\s+\w+)'
        )
        
        current_chunk = []
        current_indices = []
        current_size = 0
        max_chunk_size = 800
        
        for idx, line in enumerate(lines):
            if boundary_pattern.match(line) and current_size > max_chunk_size:
                chunks.append({
                    "index": len(chunks),
                    "text": "\n".join(current_chunk),
                    "line_indices": current_indices
                })
                current_chunk = []
                current_indices = []
                current_size = 0
            current_chunk.append(line)
            current_indices.append(idx)
            current_size += len(line) + 1
            
        if current_chunk:
            chunks.append({
                "index": len(chunks),
                "text": "\n".join(current_chunk),
                "line_indices": current_indices
            })
            
    else:  # Prose/text
        current_chunk = []
        current_indices = []
        current_size = 0
        max_chunk_size = 2000
        
        # Group lines into paragraphs first
        paragraphs_lines = []
        current_para = []
        current_para_indices = []
        for idx, line in enumerate(lines):
            if not line.strip():
                if current_para:
                    paragraphs_lines.append((current_para, current_para_indices))
                    current_para = []
                    current_para_indices = []
                paragraphs_lines.append(([line], [idx]))
            else:
                current_para.append(line)
                current_para_indices.append(idx)
        if current_para:
            paragraphs_lines.append((current_para, current_para_indices))
            
        for para_lines, para_idxs in paragraphs_lines:
            para_text = "\n".join(para_lines)
            if current_size + len(para_text) > max_chunk_size and current_chunk:
                chunks.append({
                    "index": len(chunks),
                    "text": "\n".join(current_chunk),
                    "line_indices": current_indices
                })
                current_chunk = []
                current_indices = []
                current_size = 0
            current_chunk.extend(para_lines)
            current_indices.extend(para_idxs)
            current_size += len(para_text) + 2
            
        if current_chunk:
            chunks.append({
                "index": len(chunks),
                "text": "\n".join(current_chunk),
                "line_indices": current_indices
            })
        
    if not chunks:
        chunks = [{
            "index": 0,
            "text": text,
            "line_indices": list(range(len(lines)))
        }]
        
    return enforce_max_chunk_tokens(chunks)

def enforce_max_chunk_tokens(chunks: List[Dict], max_tokens: int = None) -> List[Dict]:
    """
    Guarantee no chunk exceeds the embedding model's real context window.
    chunk_text() splits on character counts, which is a proxy for token
    count, not a guarantee. This re-splits any offending chunk line-by-line,
    preserving line_indices, and re-indexes the chunk list afterward.
    """
    if max_tokens is None:
        from app.config import EMBEDDING_MAX_TOKENS
        max_tokens = EMBEDDING_MAX_TOKENS

    result = []
    for c in chunks:
        if count_tokens(c["text"]) <= max_tokens:
            result.append(c)
            continue

        lines_in_chunk = c["text"].split("\n")
        indices_in_chunk = c["line_indices"]
        sub_lines, sub_indices, sub_tokens = [], [], 0

        def flush():
            if sub_lines:
                result.append({
                    "index": -1,
                    "text": "\n".join(sub_lines),
                    "line_indices": list(sub_indices)
                })

        for line, gidx in zip(lines_in_chunk, indices_in_chunk):
            line_tokens = count_tokens(line)
            if sub_tokens + line_tokens > max_tokens and sub_lines:
                flush()
                sub_lines, sub_indices, sub_tokens = [], [], 0
            sub_lines.append(line)
            sub_indices.append(gidx)
            sub_tokens += line_tokens
        flush()

    for i, c in enumerate(result):
        c["index"] = i
    return result
