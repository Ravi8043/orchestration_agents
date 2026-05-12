import { AppError } from "../../lib/errors/app-error.js";
import { logger } from "../../config/logger.js";
import { FinnhubProvider } from "../../providers/finnhub.provider.js";
import { NewsArticle, NewsData } from "../../types/finnhub.types.js";



export class NewsService {
  constructor(private readonly finnhub: FinnhubProvider) { }

  async getCompanyNews(ticker: string): Promise<NewsData> {
    if (!ticker?.trim()) {
      throw new AppError("Ticker is required", 400, true);
    }

    try {
      const to = new Date();
      const from = new Date();

      from.setDate(from.getDate() - 7);

      const toDate = to.toISOString().split("T")[0];
      const fromDate = from.toISOString().split("T")[0];

      const news = await this.finnhub.getCompanyNews({
        symbol: ticker.toUpperCase(),
        from: fromDate,
        to: toDate
      });

      if (!Array.isArray(news)) {
        throw new AppError(
          "Invalid news response from provider",
          502,
          true
        );
      }
      const articles: NewsArticle[] = news
        .slice(0, 10)
        .map((item) => ({
          headline: item.headline,
          summary: item.summary,
          datetime: item.datetime
        }));

      return {
        articles,
        count: articles.length
      };
    } catch (error) {
      logger.error(
        {
          err: error,
          ticker
        },
        "NewsService.getCompanyNews failed"
      );

      throw new AppError(
        "Failed to fetch company news",
        500,
        true
      );
    }
  }
}