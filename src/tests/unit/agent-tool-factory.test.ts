import { describe, expect, it, vi } from "vitest";
import { AgentToolFactory, agentToolSchemas } from "../../services/agents/tools/agent-tool.factory.js";
import type { AnalysisContext, ToolTraceEntry } from "../../types/analysis.types.js";
import type { LeanPriceSnapshot } from "../../types/price.types.js";

const context: AnalysisContext = {
  runId: "run-1",
  ticker: "AAPL",
  timeframe: "30d",
  includeSocial: true,
};

const leanSnapshot: LeanPriceSnapshot = {
  ticker: "AAPL",
  timeframe: "30d",
  snapshot: {
    c: 190,
    o: 188,
    h: 192,
    l: 187,
    pc: 186,
    change: 4,
    changePercent: 2.15,
    volatility: 1.4,
    timestamp: Date.now(),
  },
  recentCandles: [],
  derivedFeatures: {
    sma10: 185,
    sma30: 180,
  },
  dataAvailability: {
    hasCandles: false,
    candleCount: 0,
    asOf: new Date().toISOString(),
  },
};

describe("AgentToolFactory", () => {
  it("executes scoped lean price snapshot tool and records a compact trace", async () => {
    const trace: ToolTraceEntry[] = [];
    const factory = new AgentToolFactory(context, trace, {
      services: {
        priceService: {
          getLeanSnapshot: vi.fn().mockResolvedValue(leanSnapshot),
          calculateIndicator: vi.fn(),
        } as any,
        newsService: {
          getCompanyNews: vi.fn(),
        } as any,
      },
    });

    const tools = factory.createSpecialistTools("MomentumTrader");
    const output = await (tools.get_price_snapshot as any).execute({
      ticker: "AAPL",
      timeframe: "30d",
    });

    expect(output.derivedFeatures).toEqual({ sma10: 185, sma30: 180 });
    expect("rsi14" in output.derivedFeatures).toBe(false);
    expect(trace).toHaveLength(1);
    expect(trace[0].toolName).toBe("get_price_snapshot");
  });

  it("rejects tool calls for unrelated tickers", async () => {
    const factory = new AgentToolFactory(context, [], {
      services: {
        priceService: {
          getLeanSnapshot: vi.fn().mockResolvedValue(leanSnapshot),
          calculateIndicator: vi.fn(),
        } as any,
        newsService: {
          getCompanyNews: vi.fn(),
        } as any,
      },
    });

    const tools = factory.createSpecialistTools("ValueInvestor");
    await expect(
      (tools.get_price_snapshot as any).execute({ ticker: "MSFT", timeframe: "30d" })
    ).rejects.toThrow(/does not match run ticker/);
  });

  it("rejects unsupported indicator names at the input schema boundary", () => {
    const result = agentToolSchemas.indicatorInputSchema.safeParse({
      ticker: "AAPL",
      timeframe: "30d",
      indicator: "ema200",
    });

    expect(result.success).toBe(false);
  });
});
