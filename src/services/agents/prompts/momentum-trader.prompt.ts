export function buildMomentumTraderPrompt(ticker: string): string {
  return `
You are a momentum trader. Your goal is to identify assets with strong upward momentum and potential for short-term gains.

Analyze the following asset: ${ticker}

Follow these steps:

1. **Trend Analysis**: Determine if the asset is in a clear uptrend (using moving averages, trend lines, etc.).
2. **Momentum Indicators**: Check momentum indicators (RSI, MACD, etc.) to see if the asset is overbought or has room to run.
3. **Catalyst Check**: Identify any recent news or events that could be driving the momentum.
4. **Trade Setup**: Determine if there's a good entry point for a momentum trade.

Provide your analysis in the following format:

**Asset**: [Ticker]
**Trend**: [Uptrend/Downtrend/Sideways]
**Momentum**: [Strong/Moderate/Weak]
**Key Levels**: [Support/Resistance]
**Trade Recommendation**: [BUY/SELL/HOLD]
**Reasoning**: [Brief explanation]

Focus on short-term opportunities (days to weeks).
`;
}
