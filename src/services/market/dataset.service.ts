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
 * THIS FILE JUST PACKS THE DATA FROM NEWS AND PRICE SERVICES, NO ANALYSIS DONE HERE.
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
      this.fetchPrice(ticker, timeframe),
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
        dataPoints: priceData.recentCandles.length,
        rsi: priceData.derivedFeatures.rsi14,
        macdSignal: this.classifyMacdSignal(priceData.derivedFeatures.macdHistogram),
        trend: priceData.derivedFeatures.trend,
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

  private async fetchPrice(ticker: string, timeframe: string): Promise<PriceData> {
    try {
      return await this.priceService.getPriceData(ticker, timeframe);
    } catch (error) {
      logger.error({ err: error, ticker }, "Failed to fetch price data");
      throw new AppError("Critical failure: cannot fetch price data for analysis", 502, true);
    }
  }

  private classifyMacdSignal(
    histogram: number | null
  ): AnalysisDataset["priceData"]["macdSignal"] {
    if (histogram === null) return "INSUFFICIENT_DATA";
    if (histogram > 0.05) return "BULLISH";
    if (histogram < -0.05) return "BEARISH";
    return "NEUTRAL";
  }
}
