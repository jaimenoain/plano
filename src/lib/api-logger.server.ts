// Cost per token by model (USD). These reflect Anthropic list prices as of May 2026.
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3 / 1_000_000,  output: 15 / 1_000_000 },
  "claude-opus-4-7":   { input: 15 / 1_000_000, output: 75 / 1_000_000 },
  "claude-haiku-4-5":  { input: 0.8 / 1_000_000, output: 4 / 1_000_000 },
};

export type ApiLogParams = {
  endpoint: string;
  method?: string;
  statusCode: number;
  durationMs: number;
  userId?: string | null;
  model?: string | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

function computeCostUsd(
  model: string | null | undefined,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined,
): number | null {
  if (!model || inputTokens == null || outputTokens == null) return null;
  const pricing = MODEL_PRICING[model];
  if (!pricing) return null;
  return inputTokens * pricing.input + outputTokens * pricing.output;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function logApiRequest(supabase: any, params: ApiLogParams): Promise<void> {
  const cost = computeCostUsd(params.model, params.inputTokens, params.outputTokens);
  try {
    await supabase.from("api_request_logs").insert({
      endpoint:      params.endpoint,
      method:        params.method ?? "POST",
      status_code:   params.statusCode,
      duration_ms:   params.durationMs,
      user_id:       params.userId ?? null,
      model:         params.model ?? null,
      input_tokens:  params.inputTokens ?? null,
      output_tokens: params.outputTokens ?? null,
      cost_usd:      cost,
      error_message: params.errorMessage ?? null,
      metadata:      params.metadata ?? null,
    });
  } catch {
    // Logging must never break the caller
  }
}
