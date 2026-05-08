export type TradeAction = "BUY" | "SELL" | "HOLD";
export type RiskLevel = "LOW" | "MODERATE" | "HIGH";
export type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface AnalyzeRequest {
  ticker: string;
  timeframe: string;
  includeSocial: boolean;
}

export interface AgentOutput {
  name: string;
  role: string;
  score: number;
  confidence: number;
  reasoning: string;
  keyData: string;
  bullCase?: string;
  bearCase?: string;
  attack?: Record<string, unknown>;
  revisedScore?: number;
}

export interface ConsensusData {
  score: number;
  action: TradeAction;
  confidence: number;
  allocation: number;
  riskLevel: RiskLevel;
  reasoning: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
  timeHorizon?: string;
  keyRisks?: string[];
  analystWeightsUsed?: Record<string, number>;
}

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
    rsi: number;
    macdSignal: "BULLISH" | "BEARISH";
    trend: string;
    dataPoints: number;
  };
}
