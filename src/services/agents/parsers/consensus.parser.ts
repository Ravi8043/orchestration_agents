import { z } from "zod";
import type { ConsensusData } from "../../../types/analysis.types.js";

const consensusSchema = z.object({
  score: z.number().min(-1).max(1),
  action: z.enum(["BUY", "SELL", "HOLD"]),
  confidence: z.number().int().min(0).max(100),
  allocation: z.number().int().min(0).max(30),
  riskLevel: z.enum(["LOW", "MODERATE", "HIGH"]),
  reasoning: z.string(),
  stopLoss: z.number().nullable().optional(),
  takeProfit: z.number().nullable().optional(),
  timeHorizon: z.string().optional(),
  keyRisks: z.array(z.string()).optional(),
  analystWeightsUsed: z.record(z.number()).optional()
});

export function parseConsensus(input: unknown): ConsensusData {
  return consensusSchema.parse(input);
}
