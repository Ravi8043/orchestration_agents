import { z } from "zod";
import type { AgentOutput } from "../../../types/analysis.types.js";

const agentOutputSchema = z.object({
  name: z.string(),
  role: z.string(),
  score: z.number().min(-1).max(1),
  confidence: z.number().int().min(0).max(100),
  reasoning: z.string(),
  keyData: z.string(),
  bullCase: z.string().optional(),
  bearCase: z.string().optional(),
  revisedScore: z.number().min(-1).max(1).optional(),
  attack: z.record(z.unknown()).optional()
});

export function parseAgentOutput(input: unknown): AgentOutput {
  return agentOutputSchema.parse(input);
}
