import type { AnalysisDataset } from "../../types/analysis.types.js";
import { NewsService } from "../market/news.service.js";
import { PriceService } from "../market/price.service.js";
import { SocialService } from "../market/social.service.js";

export class DatasetService {
  private readonly newsService = new NewsService();
  private readonly priceService = new PriceService();
  private readonly socialService = new SocialService();

  async buildDataset(input: {
    ticker: string;
    timeframe: string;
    includeSocial: boolean;
  }): Promise<AnalysisDataset> {
    const [newsData, priceData] = await Promise.all([
      this.newsService.fetchNews(input.ticker),
      this.priceService.getPriceData(input.ticker),
    ]);

    return {
      ticker: input.ticker,
      timestamp: new Date().toISOString(),
    };
  }
}
