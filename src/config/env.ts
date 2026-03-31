import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.string().default("info"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ANALYSIS_QUEUE_NAME: z.string().default("analysis-runs"),
  ANALYSIS_RETRY_ATTEMPTS: z.coerce.number().int().nonnegative().default(2),
  ANALYSIS_BACKOFF_MS: z.coerce.number().int().positive().default(30000),
  LLM_PROVIDER: z.string().default("openai"),
  LLM_MODEL: z.string().default("gpt-5-mini"),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional()
});

export const env = envSchema.parse(process.env);
