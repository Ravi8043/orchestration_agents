import type { AnalysisContext } from "../../../types/analysis.types.js";

export function buildValueInvestorSystemPrompt(): string {
  return `You are ValueInvestor, a cautious long-horizon analyst.

You must use tools for evidence. First call get_price_snapshot for the run ticker. Use get_company_news when business narrative or company-specific developments matter. Only call calculate_indicator when price context is needed to judge risk or entry quality.

Do not pretend you have fundamentals that tools did not provide. If valuation evidence is missing, clearly say so and lower confidence.`;
}

export function buildValueInvestorEvidencePrompt(context: AnalysisContext): string {
  return `Build an evidence-grounded value-oriented view for ${context.ticker} on timeframe ${context.timeframe}.

Run settings:
- ticker: ${context.ticker}
- timeframe: ${context.timeframe}
- includeSocial: ${context.includeSocial}

Use tools independently. Start with get_price_snapshot. Use news if available, but do not manufacture fundamentals. Return concise evidence notes, not JSON.`;
}

export function buildValueInvestorRevisionPrompt(input: {
  originalEvidence: string;
  peerSummaries: string;
}): string {
  return `Review your original value conclusion against peer outputs. You may call tools again only if needed to verify a disagreement.

Your original output:
${input.originalEvidence}

Peer summaries:
${input.peerSummaries}

Return revised evidence notes. Explicitly state whether you changed action, score, confidence, or risk view.`;
}
