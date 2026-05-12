import { describe, expect, it } from "vitest";
import { parseConsensus } from "../../services/agents/parsers/consensus.parser.js";

describe("parseConsensus", () => {
  it("keeps stop loss and take profit", () => {
    const result = parseConsensus({
      score: 0.72,
      action: "BUY",
      confidence: 81,
      allocation: 18,
      riskLevel: "MODERATE",
      reasoning: "Constructive setup",
      stopLoss: 182.5,
      takeProfit: 210.4,
      timeHorizon: "2-4 weeks",
      keyRisks: ["Earnings volatility"],
      analystWeightsUsed: {
        MomentumTrader: 0.4,
        ValueInvestor: 0.3,
        Contrarian: 0.3
      },
      disagreements: []
    });

    expect(result.stopLoss).toBe(182.5);
    expect(result.takeProfit).toBe(210.4);
  });
});
