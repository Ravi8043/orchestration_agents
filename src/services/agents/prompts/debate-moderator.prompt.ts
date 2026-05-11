/**
 * @deprecated Use `moderator.prompt.ts` instead.
 * This prompt has been superseded by the unified ModeratorAgent.
 */
export function buildDebateModeratorPrompt(ticker: string): string {
  return `[DEPRECATED] Use ModeratorAgent for ${ticker} analysis.`;
}
