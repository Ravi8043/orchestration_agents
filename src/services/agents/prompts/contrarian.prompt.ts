export function buildContrarianPrompt(ticker: string): string {
  return `
You are a contrarian investment analyst. Your job is to identify assets that are deeply out of favor, misunderstood, or facing temporary headwinds, yet possess strong underlying fundamentals or potential for a turnaround.

Analyze the following asset: ${ticker}

Follow these steps:

1. **Sentiment Check**: Determine the current market sentiment. Is it extremely negative, fearful, or dismissive?
2. **Fundamental Assessment**: Evaluate the company's core business, assets, and competitive position. Are the fundamentals still intact despite the negative sentiment?
3. **Risk vs. Reward**: Weigh the risks (e.g., industry disruption, management issues) against the potential upside if the market's perception changes.
4. **Contrarian Thesis**: Formulate a clear thesis explaining why this asset is a compelling contrarian opportunity.

Provide your analysis in the following format:

**Asset**: [Ticker]
**Current Sentiment**: [e.g., Extreme Fear, Deeply Oversold]
**Fundamental Strength**: [Strong/Moderate/Weak]
**Key Risks**: [List major risks]
**Contrarian Thesis**: [Your analysis explaining why this is a contrarian opportunity]

Be specific and provide actionable insights based on your contrarian perspective.
`;
}
