import { describe, expect, it } from "vitest";
import { PriceService } from "../../services/market/price.service.js";

function buildFakeFinnhub() {
  const closes = Array.from({ length: 45 }, (_, index) => 100 + index);

  return {
    getQuote: async () => ({
      c: 145,
      d: 2,
      dp: 1.4,
      h: 146,
      l: 143,
      o: 144,
      pc: 143,
      t: Date.now(),
    }),
    getCandles: async () => ({
      c: closes,
      h: closes.map((value) => value + 1),
      l: closes.map((value) => value - 1),
      o: closes.map((value) => value - 0.5),
      t: closes.map((_, index) => 1700000000 + index * 86400),
      v: closes.map(() => 1000),
      s: "ok",
    }),
  };
}

describe("PriceService tool-facing methods", () => {
  it("returns a lean snapshot without optional indicators", async () => {
    const service = new PriceService(buildFakeFinnhub() as any);

    const snapshot = await service.getLeanSnapshot("AAPL", "30d");

    expect(snapshot.derivedFeatures).toEqual({
      sma10: expect.any(Number),
      sma30: expect.any(Number),
    });
    expect("rsi14" in snapshot.derivedFeatures).toBe(false);
    expect(snapshot.recentCandles).toHaveLength(10);
  });

  it("returns exactly the requested optional indicator", async () => {
    const service = new PriceService(buildFakeFinnhub() as any);

    const indicator = await service.calculateIndicator("AAPL", "30d", "macd");

    expect(indicator.indicator).toBe("macd");
    expect(indicator.value).toEqual({
      macd: expect.any(Number),
      signal: expect.any(Number),
      histogram: expect.any(Number),
    });
  });
});
