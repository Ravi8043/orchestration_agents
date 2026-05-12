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
  IndicatorResult,
  LeanPriceSnapshot,
} from "../../types/price.types.js";
import type { IndicatorName } from "../../types/analysis.types.js";

export class PriceService {
  constructor(private readonly finnhub: FinnhubProvider) { }

  /**
   * Fetch comprehensive price data 
   */
  async getPriceData(ticker: string, timeframe = "30d"): Promise<PriceData> {
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

      const to = Math.floor(Date.now() / 1000);
      const from = to - this.resolveLookbackSeconds(timeframe);

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

      const recentCandles = this.extractRecentCandles(candles, 10);

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

  async getLeanSnapshot(ticker: string, timeframe = "30d"): Promise<LeanPriceSnapshot> {
    const priceData = await this.getPriceData(ticker, timeframe);

    return {
      ticker: ticker.toUpperCase(),
      timeframe,
      snapshot: priceData.snapshot,
      recentCandles: priceData.recentCandles,
      derivedFeatures: {
        sma10: priceData.derivedFeatures.sma10,
        sma30: priceData.derivedFeatures.sma30,
      },
      dataAvailability: {
        hasCandles: priceData.recentCandles.length > 0,
        candleCount: priceData.recentCandles.length,
        asOf: new Date(priceData.snapshot.timestamp).toISOString(),
      },
    };
  }

  async calculateIndicator(
    ticker: string,
    timeframe: string,
    indicator: IndicatorName
  ): Promise<IndicatorResult> {
    const priceData = await this.getPriceData(ticker, timeframe);
    const features = priceData.derivedFeatures;

    switch (indicator) {
      case "rsi14":
        return { indicator, value: features.rsi14 };
      case "macd":
        return {
          indicator,
          value: {
            macd: features.macd,
            signal: features.macdSignal,
            histogram: features.macdHistogram,
          },
        };
      case "atrPercent":
        return { indicator, value: features.atrPercent };
      case "trend":
        return {
          indicator,
          value: {
            trend: features.trend,
            trendStrength: features.trendStrength,
          },
        };
      default:
        throw new AppError("Unsupported indicator", 400, true);
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

  private resolveLookbackSeconds(timeframe: string): number {
    const daysByTimeframe: Record<string, number> = {
      "1d": 7,
      "5d": 14,
      "7d": 21,
      "30d": 60,
      "90d": 140,
      "1y": 420,
      "2y": 800,
      "5y": 1900,
    };

    const days = daysByTimeframe[timeframe] ?? daysByTimeframe["30d"];
    return days * 24 * 60 * 60;
  }

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
      return {
        sma10: 0,
        sma30: 0,
        rsi14: null,
        macd: null,
        macdSignal: null,
        macdHistogram: null,
        atrPercent: 0,
        priceVsSma10Percent: 0,
        priceVsSma30Percent: 0,
        trend: "INSUFFICIENT_DATA",
        trendStrength: 0,
      };
    }

    const closes = candles.map((c) => c.close);

    const sma10 = this.calculateSma(closes.slice(-10));
    const sma30 = this.calculateSma(closes.slice(-30));
    const rsi14 = this.calculateRsi(closes, 14);
    const macd = this.calculateMacd(closes);
    const atrPercent = this.calculateVolatility(candles);

    const priceVsSma10Percent = ((currentPrice - sma10) / sma10) * 100;
    const priceVsSma30Percent = ((currentPrice - sma30) / sma30) * 100;
    const trend = this.classifyTrend(priceVsSma10Percent, priceVsSma30Percent);
    const trendStrength = Math.min(
      100,
      Math.round((Math.abs(priceVsSma10Percent) + Math.abs(priceVsSma30Percent)) * 5)
    );

    return {
      sma10: Number(sma10.toFixed(2)),
      sma30: Number(sma30.toFixed(2)),
      rsi14: rsi14 === null ? null : Number(rsi14.toFixed(2)),
      macd: macd.macd === null ? null : Number(macd.macd.toFixed(4)),
      macdSignal: macd.signal === null ? null : Number(macd.signal.toFixed(4)),
      macdHistogram: macd.histogram === null ? null : Number(macd.histogram.toFixed(4)),
      atrPercent: Number(atrPercent.toFixed(2)),
      priceVsSma10Percent: Number(priceVsSma10Percent.toFixed(2)),
      priceVsSma30Percent: Number(priceVsSma30Percent.toFixed(2)),
      trend,
      trendStrength,
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

  private calculateRsi(closes: number[], period: number): number | null {
    if (closes.length <= period) return null;

    let gains = 0;
    let losses = 0;

    for (let i = closes.length - period; i < closes.length; i++) {
      const delta = closes[i] - closes[i - 1];
      if (delta >= 0) {
        gains += delta;
      } else {
        losses += Math.abs(delta);
      }
    }

    const averageGain = gains / period;
    const averageLoss = losses / period;
    if (averageLoss === 0) return 100;

    const relativeStrength = averageGain / averageLoss;
    return 100 - 100 / (1 + relativeStrength);
  }

  private calculateMacd(closes: number[]): {
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  } {
    if (closes.length < 35) {
      return { macd: null, signal: null, histogram: null };
    }

    const ema12 = this.calculateEmaSeries(closes, 12);
    const ema26 = this.calculateEmaSeries(closes, 26);
    const macdSeries = ema12
      .map((value, index) => {
        const slow = ema26[index];
        return value === null || slow === null ? null : value - slow;
      })
      .filter((value): value is number => value !== null);

    if (macdSeries.length < 9) {
      return { macd: null, signal: null, histogram: null };
    }

    const signalSeries = this.calculateEmaSeries(macdSeries, 9);
    const macd = macdSeries[macdSeries.length - 1];
    const signal = signalSeries[signalSeries.length - 1];

    if (signal === null) {
      return { macd, signal: null, histogram: null };
    }

    return { macd, signal, histogram: macd - signal };
  }

  private calculateEmaSeries(values: number[], period: number): Array<number | null> {
    const multiplier = 2 / (period + 1);
    const series: Array<number | null> = [];
    let previousEma: number | null = null;

    values.forEach((value, index) => {
      if (index < period - 1) {
        series.push(null);
        return;
      }

      if (index === period - 1) {
        previousEma = this.calculateSma(values.slice(0, period));
        series.push(previousEma);
        return;
      }

      previousEma = value * multiplier + (previousEma as number) * (1 - multiplier);
      series.push(previousEma);
    });

    return series;
  }

  private classifyTrend(
    priceVsSma10Percent: number,
    priceVsSma30Percent: number
  ): DerivedFeatures["trend"] {
    if (priceVsSma10Percent > 1 && priceVsSma30Percent > 1) return "UPTREND";
    if (priceVsSma10Percent < -1 && priceVsSma30Percent < -1) return "DOWNTREND";
    return "SIDEWAYS";
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
