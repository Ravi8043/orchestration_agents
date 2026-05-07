const tavily = require("@tavily/core");
import { logger } from "../../config/logger.js";
import { AppError } from "../../lib/errors/app-error.js";

const apiKey = process.env.TAVILY_API_KEY;

if (!apiKey) {
  throw new Error("TAVILY_API_KEY is missing");
}

const tvly = tavily({ apiKey });

export interface NewsArticle {
  title: string;
  summary: string;
  url: string;
}

export interface NewsData {
  articles: NewsArticle[];
  count: number;
}

interface TavilyResult {
  title?: string;
  content?: string;
  url?: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

export class NewsService {
  constructor(private tavilyClient = tvly) { }

  async fetchNews(ticker: string): Promise<NewsData> {
    if (!ticker?.trim()) {
      throw new AppError("Ticker is required", 400, true);
    }

    try {
      const response: TavilyResponse = await this.tavilyClient.search({
        query: ticker.trim(),
        max_results: 10,
        search_depth: "advanced",
        topic: "finance",
        time_range: "week",
        include_answer: true,
      });

      const articles = response.results
        .filter(
          (r): r is Required<TavilyResult> =>
            !!r.title && !!r.content && !!r.url
        )
        .map((result) => ({
          title: result.title,
          summary: result.content,
          url: result.url,
        }));

      logger.info(
        {
          ticker,
          count: articles.length,
        },
        "News fetched successfully"
      );

      return {
        articles,
        count: articles.length,
      };
    } catch (err) {
      logger.error({ err, ticker }, "Failed to fetch news");
      throw new AppError("Failed to fetch news", 500, true);
    }
  }
};