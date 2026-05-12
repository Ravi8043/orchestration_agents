
// ─── Snapshot: real-time quote data ─────────────────────────────────────────
export interface PriceSnapshot {
    c: number;  // current price
    o: number;  // open
    h: number;  // high
    l: number;  // low
    pc: number; // previous close
    change: number;
    changePercent: number;
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
    rsi14: number | null;
    macd: number | null;
    macdSignal: number | null;
    macdHistogram: number | null;
    atrPercent: number;
    priceVsSma10Percent: number;
    priceVsSma30Percent: number;
    trend: "UPTREND" | "DOWNTREND" | "SIDEWAYS" | "INSUFFICIENT_DATA";
    trendStrength: number;
}

// ─── Composite response: agent-friendly market intelligence ─────────────────
export interface PriceData {
    snapshot: PriceSnapshot;
    recentCandles: PriceCandle[];
    derivedFeatures: DerivedFeatures;
}

export interface LeanPriceSnapshot {
    ticker: string;
    timeframe: string;
    snapshot: PriceSnapshot;
    recentCandles: PriceCandle[];
    derivedFeatures: Pick<DerivedFeatures, "sma10" | "sma30">;
    dataAvailability: {
        hasCandles: boolean;
        candleCount: number;
        asOf: string;
    };
}

export type IndicatorResult =
    | { indicator: "rsi14"; value: number | null }
    | {
        indicator: "macd";
        value: {
            macd: number | null;
            signal: number | null;
            histogram: number | null;
        };
    }
    | { indicator: "atrPercent"; value: number }
    | {
        indicator: "trend";
        value: {
            trend: DerivedFeatures["trend"];
            trendStrength: number;
        };
    };
