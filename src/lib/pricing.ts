type TokenUsage = { input_tokens?: number | null; output_tokens?: number | null } | undefined;

// USD per token, centralized so estimates can be updated without touching the pipeline.
const PRICING = {
  transcription: { input: 1.25 / 1_000_000, output: 5 / 1_000_000 },
  extraction: { input: 0.4 / 1_000_000, output: 1.6 / 1_000_000 },
} as const;

function estimate(usage: TokenUsage, price: { input: number; output: number }) {
  if (!usage) return 0;
  return (usage.input_tokens ?? 0) * price.input + (usage.output_tokens ?? 0) * price.output;
}

export function calculateEstimatedCosts(transcription: TokenUsage, extraction: TokenUsage) {
  const transcriptionCost = estimate(transcription, PRICING.transcription);
  const extractionCost = estimate(extraction, PRICING.extraction);
  return {
    transcriptionCost,
    extractionCost,
    estimatedApiCost: transcriptionCost + extractionCost,
  };
}
