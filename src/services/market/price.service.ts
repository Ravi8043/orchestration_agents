export interface PriceData {
  currentPrice: number;
  changePct: number;
  rsi: number;
  macdSignal: "BULLISH" | "BEARISH";
  trend: string;
  dataPoints: number;
}

const timeframeToPoints: Record<string, number> = {
  "1d": 1,
  "5d": 5,
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "1y": 252,
  "2y": 504,
  "5y": 1260
};

export class PriceService {
  async getPriceData(_ticker: string, timeframe: string): Promise<PriceData> {
    const dataPoints = timeframeToPoints[timeframe] ?? 30;
    const currentPrice = 180 + Math.random() * 80;
    const changePct = -6 + Math.random() * 12;
    const rsi = 35 + Math.random() * 35;

    return {
      currentPrice: Number(currentPrice.toFixed(2)),
      changePct: Number(changePct.toFixed(2)),
      rsi: Number(rsi.toFixed(1)),
      macdSignal: changePct >= 0 ? "BULLISH" : "BEARISH",
      trend: changePct >= 2 ? "UPTREND" : changePct <= -2 ? "DOWNTREND" : "RANGE",
      dataPoints
    };
  }
}
