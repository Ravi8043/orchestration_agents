import rateLimit from "express-rate-limit";

export const analysisRateLimiter = rateLimit({
  windowMs: 60_000, // 60 seconds the limiter will reset every one min
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});
