export interface NewsData {
  headlines: string[];
  summaries: string[];
  sources: string[];
  count: number;
}

export class NewsService {
  async getNews(ticker: string): Promise<NewsData> {
    return {
      headlines: [
        `${ticker} posts mixed quarterly signal`,
        `Analysts debate ${ticker} near-term upside`,
        `Institutional flow in ${ticker} remains active`
      ],
      summaries: [
        "Recent filing and earnings commentary show mixed sentiment.",
        "Street targets are widening, reflecting uncertainty.",
        "Volume patterns show ongoing accumulation and distribution."
      ],
      sources: ["mock-news-1", "mock-news-2", "mock-news-3"],
      count: 3
    };
  }
}
