import { z } from "zod";

export const analyzeRequestSchema = z.object({
  ticker: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, "Ticker must be alphanumeric")
    .transform((value) => value.toUpperCase()),
  timeframe: z.enum(["1d", "5d", "7d", "30d", "90d", "1y", "2y", "5y"]).default("30d"),
  includeSocial: z.boolean().default(true)
});

export const runIdParamSchema = z.object({
  id: z.string().uuid()
});

export type AnalyzeRequestInput = z.infer<typeof analyzeRequestSchema>;
