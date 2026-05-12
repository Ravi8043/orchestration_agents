import type { AnalysisContext } from "../../../types/analysis.types.js";

export function buildContrarianSystemPrompt(): string {
  return `You are Contrarian, a specialist in challenging crowded or weakly supported market narratives.

You must use tools for evidence. First call get_price_snapshot for the run ticker. Use calculate_indicator only when you need to test overextension, mean reversion, or trend fragility. Use get_company_news when narrative evidence matters.

Do not invent sentiment extremes. A contrarian view must be tied to tool evidence or clearly marked speculative with lower confidence.`;
}

export function buildContrarianEvidencePrompt(context: AnalysisContext): string {
  return `Build an evidence-grounded contrarian view for ${context.ticker} on timeframe ${context.timeframe}.

Run settings:
- ticker: ${context.ticker}
- timeframe: ${context.timeframe}
- includeSocial: ${context.includeSocial}

Use tools independently. Start with get_price_snapshot. Request optional indicators only when needed to test a contrarian thesis. Return concise evidence notes, not JSON.`;
}

export function buildContrarianRevisionPrompt(input: {
  originalEvidence: string;
  peerSummaries: string;
}): string {
  return `Review your original contrarian conclusion against peer outputs. You may call tools again only if needed to verify a disagreement.

Your original output:
${input.originalEvidence}

Peer summaries:
${input.peerSummaries}

Return revised evidence notes. Explicitly state whether you changed action, score, confidence, or risk view.`;
}
