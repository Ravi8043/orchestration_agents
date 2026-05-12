import {
    QuoteResponse,
    CandleResponse,
    NewsItem,
    GetQuoteParams,
    GetCandlesParams,
    GetCompanyNewsParams,
    GetCompanyProfileParams,
} from "../types/finnhub.types.js";
import { env } from "../config/env.js";

export class FinnhubProvider {
    private readonly baseUrl = "https://finnhub.io/api/v1";
    private readonly apiKey: string;

    constructor(apiKey = env.FINNHUB_API_KEY) {
        this.apiKey = apiKey;
    }

    private async request<T>(endpoint: string): Promise<T> {
        const url = `${this.baseUrl}${endpoint}&token=${this.apiKey}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(
                `Finnhub API Error: ${response.status} ${response.statusText}`
            );
        }

        return response.json() as Promise<T>;
    }

    async getQuote(params: GetQuoteParams): Promise<QuoteResponse> {
        const { symbol } = params;
        return this.request<QuoteResponse>(`/quote?symbol=${symbol}`);
    }

    async getCandles(params: GetCandlesParams): Promise<CandleResponse> {
        const { symbol, resolution, from, to } = params;
        return this.request<CandleResponse>(
            `/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}`
        );
    }

    async getCompanyNews(params: GetCompanyNewsParams): Promise<NewsItem[]> {
        const { symbol, from, to } = params;
        return this.request<NewsItem[]>(
            `/company-news?symbol=${symbol}&from=${from}&to=${to}`
        );
    }

    async getCompanyProfile(params: GetCompanyProfileParams) {
        const { symbol } = params;
        return this.request(`/stock/profile2?symbol=${symbol}`);
    }
}
