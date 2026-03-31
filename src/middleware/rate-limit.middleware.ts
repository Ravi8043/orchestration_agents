import rateLimit from "express-rate-limit";

export const analysisRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});
