import type {
  AgentOutput,
  AnalysisDataset,
  ConsensusData
} from "../../types/analysis.types.js";
import { parseAgentOutput } from "./parsers/agent-output.parser.js";
import { parseConsensus } from "./parsers/consensus.parser.js";

export class OrchestratorService {
  run(dataset: AnalysisDataset): { agentOutputs: AgentOutput[]; consensus: ConsensusData } {
    const directionBias = dataset.priceData.changePct >= 0 ? 1 : -1;
    const socialBias = dataset.socialData ? dataset.socialData.sentimentScore - 0.5 : 0;
    const trendScore = Math.max(-1, Math.min(1, dataset.priceData.changePct / 10));

    const valueScore = Math.max(-1, Math.min(1, trendScore * 0.4 + socialBias * 0.2));
    const momentumScore = Math.max(-1, Math.min(1, trendScore * 0.8 + socialBias * 0.3));
    const contrarianScore = Math.max(-1, Math.min(1, -trendScore * 0.5 + socialBias * -0.2));

    const agentOutputs = [
      parseAgentOutput({
        name: "Long-Term Value Investor",
        role: "value_investor",
        score: Number(valueScore.toFixed(2)),
        confidence: 68,
        reasoning: `Value case leans ${valueScore >= 0 ? "constructive" : "defensive"} based on price regime and fundamental-style patience.`,
        keyData: `Trend: ${dataset.priceData.trend}`,
        bullCase: "Improving trend can support long-term accumulation.",
        bearCase: "Short-term weakness may mask deeper risk."
      }),
      parseAgentOutput({
        name: "Momentum Swing Trader",
        role: "momentum_trader",
        score: Number(momentumScore.toFixed(2)),
        confidence: 74,
        reasoning: `Momentum reads ${dataset.priceData.macdSignal.toLowerCase()} with ${dataset.priceData.rsi.toFixed(1)} RSI.`,
        keyData: `Change %: ${dataset.priceData.changePct}`,
        bullCase: "Positive trend continuation can extend move.",
        bearCase: "Momentum can reverse if follow-through disappears."
      }),
      parseAgentOutput({
        name: "Contrarian Risk Strategist",
        role: "contrarian",
        score: Number(contrarianScore.toFixed(2)),
        confidence: 63,
        reasoning: `Contrarian lens fades crowding when price and sentiment stretch too far in one direction.`,
        keyData: `Social score: ${dataset.socialData?.sentimentScore ?? 0}`,
        bullCase: "Washed-out setups can reverse sharply higher.",
        bearCase: "Crowded optimism can unwind quickly."
      })
    ];

    const averageScore =
      agentOutputs.reduce((sum, item) => sum + item.score, 0) / agentOutputs.length;
    const action: ConsensusData["action"] =
      averageScore > 0.2 ? "BUY" : averageScore < -0.2 ? "SELL" : "HOLD";
    const confidence = Math.min(
      90,
      Math.round(
        (agentOutputs.reduce((sum, item) => sum + item.confidence, 0) / agentOutputs.length +
          Math.abs(averageScore) * 25)
      )
    );
    const allocation = action === "HOLD" ? 0 : Math.min(30, Math.max(5, Math.round(Math.abs(averageScore) * 30)));
    const currentPrice = dataset.priceData.currentPrice;
    const stopLoss = action === "BUY" ? Number((currentPrice * 0.94).toFixed(2)) : null;
    const takeProfit = action === "BUY" ? Number((currentPrice * 1.1).toFixed(2)) : null;

    const consensus = parseConsensus({
      score: Number(averageScore.toFixed(2)),
      action,
      confidence,
      allocation,
      riskLevel: directionBias > 0 ? "MODERATE" : "HIGH",
      reasoning: `Consensus blends value, momentum, and contrarian views against the current trend and sentiment backdrop.`,
      stopLoss,
      takeProfit,
      timeHorizon: action === "HOLD" ? "wait-and-watch" : "1-4 weeks",
      keyRisks: [
        "Market-wide volatility",
        "News sentiment reversal",
        "Overfitting to mock market inputs"
      ],
      analystWeightsUsed: {
        value_investor: 0.35,
        momentum_trader: 0.3,
        contrarian: 0.25,
        debate_moderator: 0.1
      }
    });

    return { agentOutputs, consensus };
  }
}
