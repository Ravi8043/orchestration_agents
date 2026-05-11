import { z } from "zod";
import type { ConsensusData } from "../../../types/analysis.types.js";

/**
 * Runtime validation schema for ConsensusData.
 * Used to validate moderator output before DB persistence.
 */
const consensusSchema = z.object({
  score: z.number().min(-1).max(1),
  action: z.enum(["BUY", "SELL", "HOLD"]),
  confidence: z.number().int().min(0).max(100),
  allocation: z.number().int().min(0).max(30),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH"]),
  reasoning: z.string(),
  stopLoss: z.number().nullable(),
  takeProfit: z.number().nullable(),
  timeHorizon: z.string(),
  keyRisks: z.array(z.string()),
  analystWeightsUsed: z.record(z.number()),
  disagreements: z.array(z.string()),
});

export function parseConsensus(input: unknown): ConsensusData {
  return consensusSchema.parse(input);
}
