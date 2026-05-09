import { AppError } from "../../lib/errors/app-error.js";
import { FinnhubProvider } from "../../providers/finnhub.provider.js";
import { NewsItem } from "../../types/finnhub.types.js";



export class NewsService {
    constructor(private readonly finnhub: FinnhubProvider) { }
    async getCompanyNews(ticker: string): Promise<NewsItem[]> {
        if (!ticker?.trim()) {
            throw new AppError("ticker is required", 400, true);
        }
        const to = Math.floor(Date.now() / 1000);
        const from = to - 30 * 24 * 60 * 60;
        const newsData = await this.finnhub.getCompanyNews({ symbol: ticker.toUpperCase(), from: `${from}`, to: `${to}` });
        if (!newsData) {
            throw new AppError("Failed to fetch news", 500, true);
        }
        return newsData.map((item) => ({
            datetime: item.datetime,
            headline: item.headline,
            summary: item.summary,
        }));
    }
}