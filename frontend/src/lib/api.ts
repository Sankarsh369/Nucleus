export interface LineDiff {
  line: string;
  kept: boolean;
  reason: string;
}

export interface QAValidationDetail {
  question: string;
  answer_raw: string;
  answer_compressed: string;
  match_score: number;
}

export interface StageBreakdown {
  stage: string;
  tokens: number;
  description: string;
}

export interface CompressionStage {
  stage: string;
  description: string;
  removed_items?: string[] | null;
  tokens_before: number;
  tokens_after?: number | null;
}

export interface CompressionResult {
  compressed_text: string;
  raw_tokens: number;
  compressed_tokens: number;
  compression_ratio: number;
  accuracy_retained?: number;
  stage2_provider?: string;
  validation_provider?: string;
  providerUsed?: string;
  cost_saved_usd: number;
  latency_speedup_ratio?: number;
  latency_speedup_is_estimated?: boolean;
  plain_english_summary?: string;
  structured_diff?: LineDiff[];
  validation_details?: QAValidationDetail[];
  stage_breakdown?: StageBreakdown[];
  compression_trace?: CompressionStage[];
  run_id?: string;
}

export async function compressContext(text: string, qaPairs: { question: string; expected_answer?: string }[]): Promise<CompressionResult> {
  const payload: Record<string, unknown> = { text };
  if (qaPairs && qaPairs.length > 0) {
    payload.qa_pairs = qaPairs;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
  const response = await fetch(`${apiUrl}/compress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || `API error: ${response.status}`);
  }

  return response.json();
}
