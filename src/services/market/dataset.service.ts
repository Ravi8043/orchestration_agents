import { FinnhubProvider } from "../../providers/finnhub.provider.js";
import { NewsService } from "./news.service.js";
import { PriceService } from "./price.service.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../lib/errors/app-error.js";
import type { AnalysisDataset } from "../../types/analysis.types.js";
import type { PriceData } from "../../types/price.types.js";
import type { NewsItem } from "../../types/finnhub.types.js";
import { nowIso } from "../../lib/utils/time.js";

export interface DatasetBuildParams {
  ticker: string;
  timeframe: string;
  includeSocial: boolean;
}

/**
 * Aggregates data from all market services into a single AnalysisDataset
 * that is consumed by the agent layer.
 *
 * This is the single entry-point for data acquisition in the analysis pipeline.
 */
export class DatasetService {
  private readonly newsService: NewsService;
  private readonly priceService: PriceService;

  constructor() {
    const finnhub = new FinnhubProvider();
    this.newsService = new NewsService(finnhub);
    this.priceService = new PriceService(finnhub);
  }

  async buildDataset(params: DatasetBuildParams): Promise<AnalysisDataset> {
    const { ticker, timeframe } = params;

    logger.info({ ticker, timeframe }, "DatasetService: building dataset");

    // Fetch news and price data concurrently
    const [newsItems, priceData] = await Promise.all([
      this.fetchNews(ticker),
      this.fetchPrice(ticker),
    ]);

    const dataset: AnalysisDataset = {
      ticker: ticker.toUpperCase(),
      timestamp: nowIso(),
      newsData: {
        headlines: newsItems.map((n) => n.headline),
        summaries: newsItems.map((n) => n.summary).filter(Boolean),
        sources: [], // Finnhub news API does not expose source in our type
        count: newsItems.length,
      },
      priceData: {
        currentPrice: priceData.snapshot.c,
        changePct: priceData.snapshot.changePercent,
        rsi: this.estimateRsi(priceData),
        macdSignal: this.estimateMacdSignal(priceData),
        trend: this.deriveTrend(priceData),
        dataPoints: priceData.recentCandles.length,
        // Attach full structured price intelligence for agents
        snapshot: priceData.snapshot,
        recentCandles: priceData.recentCandles,
        derivedFeatures: priceData.derivedFeatures,
      },
    };

    logger.info(
      {
        ticker,
        newsCount: dataset.newsData.count,
        priceDataPoints: dataset.priceData.dataPoints,
      },
      "DatasetService: dataset built"
    );

    return dataset;
  }

  // ─── Private: Data Fetching ──────────────────────────────────────────────

  private async fetchNews(ticker: string): Promise<NewsItem[]> {
    try {
      const newsData = await this.newsService.getCompanyNews(ticker);
      return newsData.articles;
    } catch (error) {
      logger.warn({ err: error, ticker }, "Failed to fetch news, continuing with empty set");
      return [];
    }
  }

  private async fetchPrice(ticker: string): Promise<PriceData> {
    try {
      return await this.priceService.getPriceData(ticker);
    } catch (error) {
      logger.error({ err: error, ticker }, "Failed to fetch price data");
      throw new AppError("Critical failure: cannot fetch price data for analysis", 502, true);
    }
  }

  // ─── Private: Derived Indicators ─────────────────────────────────────────

  /**
   * Estimate RSI from recent candle data.
   * Uses a simplified 5-period RSI calculation from available candles.
   */
  private estimateRsi(priceData: PriceData): number {
    const candles = priceData.recentCandles;
    if (candles.length < 2) return 50; // neutral fallback

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < candles.length; i++) {
      const change = candles[i].c - candles[i - 1].c;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    const periods = candles.length - 1;
    const avgGain = gains / periods;
    const avgLoss = losses / periods;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return Math.round(100 - 100 / (1 + rs));
  }

  /**
   * Estimate MACD signal from SMA crossover.
   */
  private estimateMacdSignal(priceData: PriceData): "BULLISH" | "BEARISH" {
    const { priceVsSma10Percent, priceVsSma30Percent } = priceData.derivedFeatures;

    // If price is above both SMAs and short-term momentum is stronger → bullish
    if (priceVsSma10Percent > 0 && priceVsSma10Percent > priceVsSma30Percent) {
      return "BULLISH";
    }

    return "BEARISH";
  }

  /**
   * Derive human-readable trend label from price features.
   */
  private deriveTrend(priceData: PriceData): string {
    const { priceVsSma10Percent, priceVsSma30Percent } = priceData.derivedFeatures;

    if (priceVsSma10Percent > 2 && priceVsSma30Percent > 2) return "STRONG_UPTREND";
    if (priceVsSma10Percent > 0 && priceVsSma30Percent > 0) return "UPTREND";
    if (priceVsSma10Percent < -2 && priceVsSma30Percent < -2) return "STRONG_DOWNTREND";
    if (priceVsSma10Percent < 0 && priceVsSma30Percent < 0) return "DOWNTREND";
    return "SIDEWAYS";
  }
}
