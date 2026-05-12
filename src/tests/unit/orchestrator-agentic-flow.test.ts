import { describe, expect, it, vi } from "vitest";
import { OrchestratorService } from "../../services/agents/orchestrator.service.js";
import type { AgentOutput, AnalysisContext } from "../../types/analysis.types.js";

const context: AnalysisContext = {
  runId: "run-1",
  ticker: "AAPL",
  timeframe: "30d",
  includeSocial: true,
};

function output(name: string, revisionNotes?: string): AgentOutput {
  return {
    name,
    role: name.toLowerCase(),
    action: "HOLD",
    score: 0,
    confidence: 50,
    reasoning: `${name} reasoning`,
    keyData: "price snapshot",
    bullCase: "stability",
    bearCase: "weak evidence",
    keyRisks: ["thin evidence"],
    evidence: [{ toolName: "get_price_snapshot", summary: "Price checked", usedFor: "price context" }],
    toolCalls: [],
    revisionNotes,
  };
}

describe("OrchestratorService agentic flow", () => {
  it("runs evidence, revision, and moderation phases", async () => {
    const agents = ["MomentumTrader", "ValueInvestor", "Contrarian"].map((name) => ({
      identity: { name, role: name.toLowerCase() },
      analyze: vi.fn().mockResolvedValue(output(name)),
      revise: vi.fn().mockResolvedValue(output(name, `${name} revised`)),
    }));
    const moderator = {
      identity: { name: "ChiefModerator", role: "moderator-risk-manager" },
      synthesize: vi.fn().mockResolvedValue({
        action: "HOLD",
        score: 0,
        confidence: 55,
        allocation: 0,
        riskLevel: "MODERATE",
        reasoning: "Evidence is mixed.",
        stopLoss: null,
        takeProfit: null,
        timeHorizon: "1-2 weeks",
        keyRisks: ["thin evidence"],
        analystWeightsUsed: {
          MomentumTrader: 0.34,
          ValueInvestor: 0.33,
          Contrarian: 0.33,
        },
        disagreements: [],
      }),
    };

    const service = new OrchestratorService({
      agents,
      moderator,
      createToolFactory: (_ctx, trace) => ({ getTrace: () => trace }) as any,
    });

    const result = await service.run(context);

    expect(agents.every((agent) => agent.analyze).valueOf()).toBeTruthy();
    expect(agents[0].analyze).toHaveBeenCalledOnce();
    expect(agents[0].revise).toHaveBeenCalledOnce();
    expect(moderator.synthesize).toHaveBeenCalledOnce();
    expect(result.agentOutputs).toHaveLength(3);
    expect(result.debateTrace.map((entry) => entry.phase)).toContain("revision");
    expect(result.debateTrace.map((entry) => entry.phase)).toContain("moderation");
  });
});
