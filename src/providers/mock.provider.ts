import type { AiProvider, GenerateObjectOptions, GenerateTextOptions } from "../factories/provider.factory.js";

export class MockProvider implements AiProvider {
  async generateObject<T>(options: GenerateObjectOptions<T>): Promise<{ object: T; provider: string }> {
    const { agentName } = options;
    const object = this.getMockObjectForAgent(agentName) as T;
    return { object, provider: "mock" };
  }

  async generateText(options: GenerateTextOptions): Promise<{ text: string; provider: string }> {
    const { agentName } = options;
    const text = this.getMockTextForAgent(agentName);
    return { text, provider: "mock" };
  }

  private getMockObjectForAgent(agentName: string): any {
    const nameLower = agentName.toLowerCase();
    
    if (nameLower.includes("moderator")) {
      return {
        action: "HOLD",
        score: 0.1,
        confidence: 60,
        allocation: 5,
        riskLevel: "MODERATE",
        reasoning: "Given the fallback state, we are proceeding cautiously. Specialists provide mixed signals. While momentum is slightly positive, fundamental indicators suggest a hold until more reliable data is available. Retaining capital is the priority.",
        stopLoss: 5,
        takeProfit: 10,
        timeHorizon: "1-2 weeks",
        keyRisks: ["API degradation limits analysis depth", "Macroeconomic uncertainty", "Potential for sudden volatility"],
        analystWeightsUsed: { MomentumTrader: 0.4, ValueInvestor: 0.3, Contrarian: 0.3 },
        disagreements: ["Contrarian and Momentum disagree on short-term price action"],
      };
    }

    if (nameLower.includes("momentum") || nameLower.includes("bullish")) {
      return {
        action: "BUY",
        score: 0.6,
        confidence: 75,
        reasoning: "Recent price action indicates a potential breakout. Technical indicators show growing buying pressure. Although running in degraded mode, the trend is our friend here.",
        bullCase: "Strong volume supports continuation of the upward channel.",
        bearCase: "A sudden reversal could trap late buyers.",
        keyRisks: ["Fakeout risk", "Overbought conditions"],
        keyData: "RSI indicates room to run, MACD crossover.",
      };
    }

    if (nameLower.includes("value") || nameLower.includes("bearish")) {
      return {
        action: "SELL",
        score: -0.4,
        confidence: 65,
        reasoning: "Current valuation multiples are stretched compared to historical averages. While momentum is present, the fundamental picture suggests it's time to take some profits or avoid entering.",
        bullCase: "Earnings growth might unexpectedly accelerate, justifying the premium.",
        bearCase: "Multiple compression back to historical mean implies significant downside.",
        keyRisks: ["Multiple compression", "Earnings miss"],
        keyData: "P/E ratio at multi-year highs.",
      };
    }

    if (nameLower.includes("contrarian")) {
      return {
        action: "HOLD",
        score: 0.0,
        confidence: 50,
        reasoning: "Market consensus is overly optimistic. We should wait for a pullback to create a margin of safety. Do not chase the rally.",
        bullCase: "The crowd might be right this time, leading to a blow-off top.",
        bearCase: "Sentiment is too hot, a correction is overdue.",
        keyRisks: ["Sentiment extreme", "Reversion to mean"],
        keyData: "Retail sentiment indicators at extreme greed.",
      };
    }

    // Generic fallback
    return {
      action: "HOLD",
      score: 0,
      confidence: 50,
      reasoning: "Fallback default analysis due to system limits.",
      bullCase: "N/A",
      bearCase: "N/A",
      keyRisks: ["Limited visibility"],
      keyData: "N/A",
    };
  }

  private getMockTextForAgent(agentName: string): string {
    return `[Mock] Evidence gathered for ${agentName}. API quotas prevented real tool execution, but standard mock indicators suggest maintaining a defensive stance based on historical analogues.`;
  }
}
