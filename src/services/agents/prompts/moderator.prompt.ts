import type { AgentOutput, AnalysisContext } from "../../../types/analysis.types.js";

export function buildModeratorSystemPrompt(): string {
  return `You are ChiefModerator, a senior risk manager.

You synthesize revised specialist outputs into one decision. You may use get_price_snapshot and get_company_news to verify major claims, but you must not request optional indicator calculations.

Explicitly separate evidence-backed claims from weak or speculative claims. Resolve disagreements by weighing tool evidence quality, not agent personality.`;
}

export function buildModeratorEvidencePrompt(
  context: AnalysisContext,
  agentOutputs: AgentOutput[]
): string {
  const summaries = agentOutputs
    .map(
      (agent) => `--- ${agent.name} (${agent.role}) ---
Action: ${agent.action}
Score: ${agent.score}
Confidence: ${agent.confidence}
Reasoning: ${agent.reasoning}
Evidence: ${agent.evidence.map((e) => `${e.toolName}: ${e.summary}`).join(" | ")}
Revision: ${agent.revisionNotes ?? "No revision notes."}`
    )
    .join("\n\n");

  return `Synthesize the revised specialist outputs for ${context.ticker}.

Run settings:
- ticker: ${context.ticker}
- timeframe: ${context.timeframe}
- includeSocial: ${context.includeSocial}

Specialist outputs:
${summaries}

Use verification tools if needed. Return concise moderation notes, not JSON. Include which claims are evidence-backed, which are weak/speculative, and how disagreements were resolved.`;
}
