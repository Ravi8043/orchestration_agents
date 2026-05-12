import { z } from "zod";
import type { AgentOutput } from "../../../types/analysis.types.js";

/**
 * Runtime validation schema for AgentOutput.
 * Used to validate agent outputs before DB persistence.
 */
const agentOutputSchema = z.object({
  name: z.string(),
  role: z.string(),
  action: z.enum(["BUY", "SELL", "HOLD"]),
  score: z.number().min(-1).max(1),
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string(),
  keyData: z.string(),
  bullCase: z.string(),
  bearCase: z.string(),
  keyRisks: z.array(z.string()),
  evidence: z
    .array(
      z.object({
        toolName: z.string(),
        summary: z.string(),
        usedFor: z.string(),
      })
    )
    .default([]),
  toolCalls: z
    .array(
      z.object({
        agentName: z.string(),
        toolName: z.string(),
        input: z.record(z.unknown()),
        outputSummary: z.string(),
        calledAt: z.string(),
        error: z.string().optional(),
      })
    )
    .default([]),
  revisionNotes: z.string().optional(),
});

export function parseAgentOutput(input: unknown): AgentOutput {
  return agentOutputSchema.parse(input);
}
