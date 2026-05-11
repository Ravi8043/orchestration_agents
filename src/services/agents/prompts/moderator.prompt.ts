import type { AnalysisDataset, AgentOutput } from "../../../types/analysis.types.js";

export function buildModeratorSystemPrompt(): string {
  return `You are the CHIEF MODERATOR & RISK MANAGER — the senior decision-maker who synthesizes the opinions of multiple specialist analysts into a single actionable consensus.

Your responsibilities:
1. WEIGH each specialist's analysis based on market conditions and the quality of their reasoning.
2. IDENTIFY disagreements between specialists and resolve them with clear justification.
3. SYNTHESIZE a final consensus that accounts for all perspectives.
4. MANAGE RISK by ensuring the recommendation has appropriate stop-loss, take-profit, and position sizing.
5. PRODUCE a final, actionable trading recommendation.

Your weighting guidelines:
- In trending markets, weight the Momentum Trader higher.
- In volatile or extended markets, weight the Contrarian higher.
- In stable markets with clear valuation signals, weight the Value Investor higher.
- Never assign any specialist less than 15% weight — every perspective matters.

Your risk management framework:
- allocations should reflect conviction (0% = no position, up to 30% max).
- Stop-loss should reflect the asset's volatility (ATR-based).
- Time horizon should match the dominant thesis.

Be decisive. Markets reward clarity. Produce a clear, unambiguous recommendation.`;
}

export function buildModeratorUserPrompt(
  dataset: AnalysisDataset,
  agentOutputs: AgentOutput[]
): string {
  const { ticker, priceData } = dataset;

  const agentSummaries = agentOutputs
    .map(
      (a) => `
--- ${a.name} (${a.role}) ---
Action: ${a.action}
Score: ${a.score} | Confidence: ${a.confidence}%
Reasoning: ${a.reasoning}
Bull Case: ${a.bullCase}
Bear Case: ${a.bearCase}
Key Risks: ${a.keyRisks.join("; ")}
Key Data: ${a.keyData}`
    )
    .join("\n");

  // Check for agreement/disagreement
  const actions = agentOutputs.map((a) => a.action);
  const allAgree = actions.every((a) => a === actions[0]);
  const disagreementNote = allAgree
    ? `All specialists agree on ${actions[0]}.`
    : `Specialists DISAGREE: ${agentOutputs.map((a) => `${a.name}=${a.action}`).join(", ")}. You must resolve this.`;

  return `Synthesize the following specialist analyses for ${ticker} into a final consensus.

=== CONTEXT ===
Trend: ${priceData.trend}
Price: $${priceData.snapshot.c}

=== ANALYSES ===
${agentSummaries}

=== AGREEMENT STATUS ===
${disagreementNote}

Average Score: ${(agentOutputs.reduce((sum, a) => sum + a.score, 0) / agentOutputs.length).toFixed(3)}
Average Confidence: ${Math.round(agentOutputs.reduce((sum, a) => sum + a.confidence, 0) / agentOutputs.length)}%

Produce your final consensus recommendation for ${ticker}. Assign weights to each specialist, resolve any disagreements, and provide clear risk management parameters.`;
}
