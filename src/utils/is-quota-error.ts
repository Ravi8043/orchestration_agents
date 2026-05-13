export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  
  const errorMessage = (error instanceof Error ? error.message : String(error)).toLowerCase();
  
  // ai-sdk usually attaches statusCode to errors
  const statusCode = (error as any).statusCode || (error as any).status;
  if (statusCode === 429) {
    return true;
  }

  const quotaKeywords = [
    "quota",
    "rate limit",
    "too many requests",
    "429",
    "exhausted",
    "resource exhausted",
    "rate_limit_exceeded"
  ];

  return quotaKeywords.some((keyword) => errorMessage.includes(keyword));
}
