/**
 * Agent type definitions for the multi-agent system.
 *
 * NOTE: Canonical types live in `types/analysis.types.ts`.
 * These are kept for backward compatibility with any external consumers.
 */

export interface Agent {
  role: string;
  model: string;
  tools: string[];
}

export interface AgentConfig {
  role: string;
  model: string;
  prompt: string;
}

// Re-export canonical types for convenience
export type { AgentOutput, ConsensusData } from "../../../types/analysis.types.js";
