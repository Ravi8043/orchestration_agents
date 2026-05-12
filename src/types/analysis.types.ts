import type { PriceSnapshot, PriceCandle, DerivedFeatures } from "./price.types.js";

// ─── Enums ───────────────────────────────────────────────────────────────────

export type TradeAction = "BUY" | "SELL" | "HOLD";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH";
export type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

// ─── Request ─────────────────────────────────────────────────────────────────

export interface AnalyzeRequest {
  ticker: string;
  timeframe: string;
  includeSocial: boolean;
}

// ─── Agent Output (stored in DB as JSON) ─────────────────────────────────────

export interface AgentOutput {
  name: string;
  role: string;
  score: number;
  confidence: number;
  action: TradeAction;
  reasoning: string;
  keyData: string;
  bullCase: string;
  bearCase: string;
  keyRisks: string[];
}

// ─── Consensus Data (stored in DB as JSON) ───────────────────────────────────

export interface ConsensusData {
  score: number;
  action: TradeAction;
  confidence: number;
  allocation: number;
  riskLevel: RiskLevel;
  reasoning: string;
  stopLoss: number | null;
  takeProfit: number | null;
  timeHorizon: string;
  keyRisks: string[];
  analystWeightsUsed: Record<string, number>;
  disagreements: string[];
}

// ─── Analysis Dataset (built by DatasetService, consumed by agents) ──────────

export interface AnalysisDataset {
  ticker: string;
  timestamp: string;
  newsData: {
    headlines: string[];
    summaries: string[];
    sources: string[];
    count: number;
  };
  priceData: {
    currentPrice: number;
    changePct: number;
    dataPoints: number;
    snapshot: PriceSnapshot;
    recentCandles: PriceCandle[];
    derivedFeatures: DerivedFeatures;
  };
}

// ─── Orchestrator Result ─────────────────────────────────────────────────────

export interface OrchestratorResult {
  agentOutputs: AgentOutput[];
  consensus: ConsensusData;
}
