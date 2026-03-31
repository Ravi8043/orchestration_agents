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
    const [newsData, priceData, socialData] = await Promise.all([
      this.newsService.getNews(input.ticker),
      this.priceService.getPriceData(input.ticker, input.timeframe),
      input.includeSocial ? this.socialService.getSocialData(input.ticker) : Promise.resolve(undefined)
    ]);

    return {
      ticker: input.ticker,
      timestamp: new Date().toISOString(),
      newsData,
      priceData,
      socialData
    };
  }
}
