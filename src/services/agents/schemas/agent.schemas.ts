import { z } from "zod";

// ─── Shared enums ────────────────────────────────────────────────────────────

export const tradeActionSchema = z.enum(["BUY", "SELL", "HOLD"]);
export const riskLevelSchema = z.enum(["LOW", "MODERATE", "HIGH"]);
export const confidenceTierSchema = z.enum(["LOW", "MODERATE", "HIGH", "VERY_HIGH"]);

// ─── Specialist Agent Output Schema ──────────────────────────────────────────

export const specialistOutputSchema = z.object({
  action: tradeActionSchema.describe(
    "The recommended trade action based on this agent's analysis perspective"
  ),
  score: z
    .number()
    .min(-1)
    .max(1)
    .describe(
      "Sentiment score from -1 (extremely bearish) to +1 (extremely bullish)"
    ),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Confidence level in the recommendation (0-100)"),
  reasoning: z
    .string()
    .min(20)
    .describe(
      "Detailed multi-sentence reasoning explaining the analysis and conclusion"
    ),
  bullCase: z
    .string()
    .describe("The strongest argument for a bullish outcome on this asset"),
  bearCase: z
    .string()
    .describe("The strongest argument for a bearish outcome on this asset"),
  keyRisks: z
    .array(z.string())
    .min(1)
    .max(5)
    .describe("Top risks identified from this agent's analytical lens"),
  keyData: z
    .string()
    .describe(
      "Most important data points or indicators that drove this recommendation"
    ),
});

export type SpecialistOutput = z.infer<typeof specialistOutputSchema>;

// ─── Moderator / Consensus Output Schema ─────────────────────────────────────

export const consensusOutputSchema = z.object({
  action: tradeActionSchema.describe(
    "Final consensus trade action after synthesizing all specialist opinions"
  ),
  score: z
    .number()
    .min(-1)
    .max(1)
    .describe("Weighted consensus sentiment score"),
  confidence: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Overall confidence in the consensus recommendation"),
  allocation: z
    .number()
    .int()
    .min(0)
    .max(30)
    .describe(
      "Recommended portfolio allocation percentage (0-30%) based on conviction and risk"
    ),
  riskLevel: riskLevelSchema.describe(
    "Overall risk level assessment for this position"
  ),
  reasoning: z
    .string()
    .min(30)
    .describe(
      "Comprehensive reasoning synthesizing all specialist viewpoints, resolving disagreements, and justifying the final recommendation"
    ),
  stopLoss: z
    .number()
    .nullable()
    .describe(
      "Recommended stop-loss percentage below entry price, or null if not applicable"
    ),
  takeProfit: z
    .number()
    .nullable()
    .describe(
      "Recommended take-profit percentage above entry price, or null if not applicable"
    ),
  timeHorizon: z
    .string()
    .describe(
      "Recommended time horizon for the trade (e.g., '1-2 weeks', '3-6 months')"
    ),
  keyRisks: z
    .array(z.string())
    .min(1)
    .max(7)
    .describe("Aggregated key risks across all specialist analyses"),
  analystWeightsUsed: z
    .record(z.number().min(0).max(1))
    .describe(
      "Weights assigned to each specialist agent in forming the consensus (values should sum to ~1.0)"
    ),
  disagreements: z
    .array(z.string())
    .describe(
      "Key areas where specialist agents disagreed, and how they were resolved"
    ),
});

export type ConsensusOutput = z.infer<typeof consensusOutputSchema>;
