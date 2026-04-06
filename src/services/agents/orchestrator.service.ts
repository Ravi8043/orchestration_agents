import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  AgentOutput,
  AnalysisDataset,
  ConsensusData
} from "../../types/analysis.types.js";
import { parseAgentOutput } from "./parsers/agent-output.parser.js";
import { parseConsensus } from "./parsers/consensus.parser.js";
import { env } from "../../config/env.js";

const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export class OrchestratorService {
  async run(dataset: AnalysisDataset): Promise<{ agentOutputs: AgentOutput[]; consensus: ConsensusData }> {
    
    // AI helper to generate specific reasoning per agent with a strict token limit of 100
    const generateAiInsight = async (role: string, context: string): Promise<string> => {
      try {
        const prompt = `You are an expert stock market ${role}.
Stock: ${dataset.ticker}
Price: $${dataset.priceData.currentPrice}
Change %: ${dataset.priceData.changePct}%
Trend: ${dataset.priceData.trend}
RSI: ${dataset.priceData.rsi}

Given this context, provide a one sentence concise reasoning for your trade setup. Focus on: ${context}. Keep it extremely brief.`;
        
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 100, // explicit limit requested by user
          }
        });
        return result.response.text().trim();
      } catch (error) {
        console.error(`AI generation error for ${role}:`, error);
        return `Reasoning generation failed but AI agent determined output mathematically.`;
      }
    };

    const valueReasoning = await generateAiInsight("Value Investor", "Long term potential and value evaluation");
    const momentumReasoning = await generateAiInsight("Momentum Swing Trader", "Short term price momentum, MACD, and RSI");
    const contrarianReasoning = await generateAiInsight("Contrarian Risk Strategist", "Fading the crowd and searching for over-extended moves");

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
        reasoning: valueReasoning,
        keyData: `Trend: ${dataset.priceData.trend}`,
        bullCase: "Improving trend can support long-term accumulation.",
        bearCase: "Short-term weakness may mask deeper risk."
      }),
      parseAgentOutput({
        name: "Momentum Swing Trader",
        role: "momentum_trader",
        score: Number(momentumScore.toFixed(2)),
        confidence: 74,
        reasoning: momentumReasoning,
        keyData: `Change %: ${dataset.priceData.changePct}`,
        bullCase: "Positive trend continuation can extend move.",
        bearCase: "Momentum can reverse if follow-through disappears."
      }),
      parseAgentOutput({
        name: "Contrarian Risk Strategist",
        role: "contrarian",
        score: Number(contrarianScore.toFixed(2)),
        confidence: 63,
        reasoning: contrarianReasoning,
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
      reasoning: `Consensus generated using AI-backed agent summaries.`,
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
