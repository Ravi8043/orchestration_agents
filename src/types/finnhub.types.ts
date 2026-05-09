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



export interface GetCandlesParams {
    symbol: string;
    resolution: string;
    from: number;
    to: number;
}


export interface GetQuoteParams {
    symbol: string;
}

export interface NewsArticle {
    headline: string;
    summary: string;
    datetime: number;
}

export interface NewsData {
    articles: NewsArticle[];
    count: number;
}
