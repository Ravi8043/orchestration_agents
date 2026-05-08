export interface FinnInput {
    ticker: string;
    resolution: string;
    from: number;
    to: number;
}

export interface FinnOutput {
    ticker: string;
    currentPrice: number;
}

export interface QuoteResponse {
    c: number; // current price
    d: number; // change
    dp: number; // percent change
    h: number; // high price
    l: number; // low price
    o: number; // open price
    pc: number; // previous close
    t: number; // timestamp
}

export interface CandleResponse {
    c: number[]; // close prices
    h: number[]; // high prices
    l: number[]; // low prices
    o: number[]; // open prices
    t: number[]; // timestamps
    v: number[]; // volumes
    s: string; // status
}

export interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export interface NewsItem {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
}

export interface GetCandlesParams {
    symbol: string;
    resolution: string;
    from: number;
    to: number;
}

export interface GetCompanyNewsParams {
    symbol: string;
    from: string;
    to: string;
}

export interface GetQuoteParams {
    symbol: string;
}

export interface GetCompanyProfileParams {
    symbol: string;
}