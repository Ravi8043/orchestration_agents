import { AppError } from "../../lib/errors/app-error.js";
import { logger } from "../../config/logger.js";
import { FinnhubProvider } from "../../providers/finnhub.provider.js";
import type {
  QuoteResponse,
  GetCandlesParams,
  CandleResponse,
  Candle,
} from "../../types/finnhub.types.js";
import {
  PriceData,
  PriceSnapshot,
  PriceCandle,
  DerivedFeatures,
} from "../../types/price.types.js";

export class PriceService {
  constructor(private readonly finnhub: FinnhubProvider) { }

  /**
   * Fetch comprehensive price data 
   */
  async getPriceData(ticker: string): Promise<PriceData> {
    if (!ticker?.trim()) {
      throw new AppError("Ticker is required", 400, true);
    }

    try {
      // Fetch quote
      const quote = await this.finnhub.getQuote({ symbol: ticker });

      if (!quote || typeof quote.c !== "number") {
        throw new AppError(
          "Invalid price data received from provider",
          502,
          true
        );
      }

      // Fetch 30 days of candles for feature calculation
      const to = Math.floor(Date.now() / 1000);
      const from = to - 30 * 24 * 60 * 60;

      let candles: Candle[] = [];
      let useFallback = false;

      try {
        const candleData = await this.getCandles({
          symbol: ticker,
          resolution: "D",
          from,
          to,
        });
        candles = this.convertCandleResponse(candleData);
      } catch (error) {
        logger.warn(
          { err: error, ticker },
          "Failed to fetch candles, using fallback calculations"
        );
        useFallback = true;
      }

      // Build snapshot
      const snapshot = this.buildSnapshot(quote, candles, useFallback);

      // Extract last 5 candles for agent context
      const recentCandles = this.extractRecentCandles(candles, 5);

      // Calculate derived features
      const derivedFeatures = this.calculateDerivedFeatures(
        quote.c,
        candles,
        useFallback
      );

      return {
        snapshot,
        recentCandles,
        derivedFeatures,
      };
    } catch (error) {
      logger.error({ err: error, ticker }, "PriceService.getPriceData failed");
      throw new AppError("Failed to fetch price data", 500, true);
    }
  }

  /**
   * Fetch candle data from provider
   */
  async getCandles(params: GetCandlesParams): Promise<CandleResponse> {
    if (!params?.symbol) {
      throw new AppError("Symbol is required", 400, true);
    }

    try {
      const candles = await this.finnhub.getCandles(params);

      if (!candles || candles.s !== "ok") {
        throw new AppError("Invalid candle data from provider", 502, true);
      }

      return candles;
    } catch (error) {
      logger.error(
        { err: error, symbol: params.symbol },
        "PriceService.getCandles failed"
      );
      throw new AppError("Failed to fetch candle data", 500, true);
    }
  }

  // ─── Private: Snapshot Construction ────────────────────────────────────────

  private buildSnapshot(
    quote: QuoteResponse,
    candles: Candle[],
    useFallback: boolean
  ): PriceSnapshot {
    const change = quote.c - quote.pc;
    const changePercent = (change / quote.pc) * 100;

    const volatility = useFallback
      ? this.calculateSimpleVolatility(quote.h, quote.l, quote.c)
      : this.calculateVolatility(candles);

    return {
      c: quote.c,
      o: quote.o,
      h: quote.h,
      l: quote.l,
      pc: quote.pc,
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      volatility,
      timestamp: Date.now(),
    };
  }

  // ─── Private: Recent Candles Extraction ─────────────────────────────────────

  private extractRecentCandles(
    candles: Candle[],
    count: number
  ): PriceCandle[] {
    if (candles.length === 0) return [];

    const recent = candles.slice(-count);

    return recent.map((c) => ({
      o: c.open,
      h: c.high,
      l: c.low,
      c: c.close,
      v: c.volume,
      t: c.timestamp,
    }));
  }

  // ─── Private: Derived Features Calculation ──────────────────────────────────

  private calculateDerivedFeatures(
    currentPrice: number,
    candles: Candle[],
    useFallback: boolean
  ): DerivedFeatures {
    if (useFallback || candles.length < 30) {
      // Return zero-initialized features if insufficient data
      return {
        sma10: 0,
        sma30: 0,
        atrPercent: 0,
        priceVsSma10Percent: 0,
        priceVsSma30Percent: 0,
      };
    }

    const closes = candles.map((c) => c.close);

    const sma10 = this.calculateSma(closes.slice(-10));
    const sma30 = this.calculateSma(closes.slice(-30));
    const atrPercent = this.calculateVolatility(candles);

    const priceVsSma10Percent = ((currentPrice - sma10) / sma10) * 100;
    const priceVsSma30Percent = ((currentPrice - sma30) / sma30) * 100;

    return {
      sma10: Number(sma10.toFixed(2)),
      sma30: Number(sma30.toFixed(2)),
      atrPercent: Number(atrPercent.toFixed(2)),
      priceVsSma10Percent: Number(priceVsSma10Percent.toFixed(2)),
      priceVsSma30Percent: Number(priceVsSma30Percent.toFixed(2)),
    };
  }

  // ─── Private: Candle Conversion ─────────────────────────────────────────────

  private convertCandleResponse(response: CandleResponse): Candle[] {
    if (!response.c || response.c.length === 0) return [];

    const candles: Candle[] = [];
    for (let i = 0; i < response.c.length; i++) {
      candles.push({
        open: response.o[i],
        high: response.h[i],
        low: response.l[i],
        close: response.c[i],
        volume: response.v[i],
        timestamp: response.t[i],
      });
    }

    return candles;
  }

  // ─── Private: Technical Indicators ──────────────────────────────────────────

  private calculateSma(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return sum / values.length;
  }

  private calculateVolatility(candles: Candle[]): number {
    if (candles.length < 2) return 0;

    const trueRanges: number[] = [];

    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const prev = candles[i - 1];

      const tr1 = current.high - current.low;
      const tr2 = Math.abs(current.high - prev.close);
      const tr3 = Math.abs(current.low - prev.close);

      trueRanges.push(Math.max(tr1, tr2, tr3));
    }

    const atr = trueRanges.reduce((sum, v) => sum + v, 0) / trueRanges.length;
    const lastClose = candles[candles.length - 1].close;

    return (atr / lastClose) * 100;
  }

  private calculateSimpleVolatility(
    high: number,
    low: number,
    current: number
  ): number {
    if (current === 0) return 0;
    return ((high - low) / current) * 100;
  }
}