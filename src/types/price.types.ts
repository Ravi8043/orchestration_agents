export type Trend = "UPTREND" | "DOWNTREND" | "SIDEWAYS";

// ─── Snapshot: real-time quote data ─────────────────────────────────────────
export interface PriceSnapshot {
    c: number;  // current price
    o: number;  // open
    h: number;  // high
    l: number;  // low
    pc: number; // previous close
    change: number;
    changePercent: number;
    trend: Trend;
    volatility: number;
    timestamp: number;
}

// ─── Candle: single OHLCV bar exposed to consumers ─────────────────────────
export interface PriceCandle {
    o: number;  // open
    h: number;  // high
    l: number;  // low
    c: number;  // close
    v: number;  // volume
    t: number;  // timestamp
}

// ─── Derived features: numeric-only quantitative signals ────────────────────
export interface DerivedFeatures {
    sma10: number;
    sma30: number;
    atrPercent: number;
    priceVsSma10Percent: number;
    priceVsSma30Percent: number;
}

// ─── Composite response: agent-friendly market intelligence ─────────────────
export interface PriceData {
    snapshot: PriceSnapshot;
    candles: PriceCandle[];
    derivedFeatures: DerivedFeatures;
}