/**
 * @deprecated Use `moderator.prompt.ts` instead.
 * The Chief Risk Manager role is now incorporated into the unified ModeratorAgent.
 */
export function buildChiefRiskManagerPrompt(ticker: string): string {
  return `[DEPRECATED] Use ModeratorAgent for ${ticker} analysis.`;
}
