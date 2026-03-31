import type { RunStatus } from "./analysis.types.js";

export interface TriggerAnalysisResponse {
  runId: string;
  status: RunStatus;
  estimatedTime: number;
  pollUrl: string;
  message?: string;
}

export interface PendingRunResponse {
  runId: string;
  status: "PENDING" | "RUNNING";
  message: string;
  elapsedTime: number;
  estimatedCompletion?: string;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}
