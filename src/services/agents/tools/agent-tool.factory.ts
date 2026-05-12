import { tool } from "ai";
import { z } from "zod";
import { FinnhubProvider } from "../../../providers/finnhub.provider.js";
import { NewsService } from "../../market/news.service.js";
import { PriceService } from "../../market/price.service.js";
import type {
  AnalysisContext,
  IndicatorName,
  ToolTraceEntry,
} from "../../../types/analysis.types.js";
import type { IndicatorResult, LeanPriceSnapshot } from "../../../types/price.types.js";

const timeframeSchema = z.enum(["1d", "5d", "7d", "30d", "90d", "1y", "2y", "5y"]);
const indicatorSchema = z.enum(["rsi14", "macd", "atrPercent", "trend"]);

const scopedTickerSchema = z.object({
  ticker: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9]+$/),
  timeframe: timeframeSchema.optional(),
});

const indicatorInputSchema = scopedTickerSchema.extend({
  indicator: indicatorSchema,
});

type ToolFactoryServices = {
  priceService: PriceService;
  newsService: NewsService;
};

type ToolFactoryOptions = {
  services?: ToolFactoryServices;
};

export class AgentToolFactory {
  private readonly priceService: PriceService;
  private readonly newsService: NewsService;
  private readonly leanSnapshotCache = new Map<string, Promise<LeanPriceSnapshot>>();
  private readonly indicatorCache = new Map<string, Promise<IndicatorResult>>();
  private readonly newsCache = new Map<string, Promise<Awaited<ReturnType<NewsService["getCompanyNews"]>>>>();

  constructor(
    private readonly context: AnalysisContext,
    private readonly trace: ToolTraceEntry[],
    options: ToolFactoryOptions = {}
  ) {
    if (options.services) {
      this.priceService = options.services.priceService;
      this.newsService = options.services.newsService;
      return;
    }

    const finnhub = new FinnhubProvider();
    this.priceService = new PriceService(finnhub);
    this.newsService = new NewsService(finnhub);
  }

  createSpecialistTools(agentName: string) {
    return {
      get_price_snapshot: this.createPriceSnapshotTool(agentName),
      get_company_news: this.createCompanyNewsTool(agentName),
      calculate_indicator: this.createIndicatorTool(agentName),
    };
  }

  createModeratorTools(agentName: string) {
    return {
      get_price_snapshot: this.createPriceSnapshotTool(agentName),
      get_company_news: this.createCompanyNewsTool(agentName),
    };
  }

  getTrace(): ToolTraceEntry[] {
    return this.trace;
  }

  private createPriceSnapshotTool(agentName: string) {
    return tool({
      description:
        "Fetch the run ticker's lean price context: quote snapshot, recent candles, SMA10, SMA30, and data availability. Does not include optional indicators.",
      inputSchema: scopedTickerSchema,
      execute: async (input) => {
        return this.traceTool(agentName, "get_price_snapshot", input, async () => {
          const scoped = this.assertScopedInput(input);
          const cacheKey = `${scoped.ticker}:${scoped.timeframe}`;
          const cached =
            this.leanSnapshotCache.get(cacheKey) ??
            this.priceService.getLeanSnapshot(scoped.ticker, scoped.timeframe);
          this.leanSnapshotCache.set(cacheKey, cached);
          return cached;
        });
      },
    });
  }

  private createCompanyNewsTool(agentName: string) {
    return tool({
      description:
        "Fetch recent company news for the run ticker. Use this only when news or narrative evidence matters.",
      inputSchema: scopedTickerSchema,
      execute: async (input) => {
        return this.traceTool(agentName, "get_company_news", input, async () => {
          const scoped = this.assertScopedInput(input);
          if (!this.context.includeSocial) {
            return {
              articles: [],
              count: 0,
              message: "News lookup disabled for this run.",
            };
          }

          const cached =
            this.newsCache.get(scoped.ticker) ?? this.newsService.getCompanyNews(scoped.ticker);
          this.newsCache.set(scoped.ticker, cached);
          return cached;
        });
      },
    });
  }

  private createIndicatorTool(agentName: string) {
    return tool({
      description:
        "Calculate exactly one optional indicator for the run ticker when your analysis needs it. Supported indicators: rsi14, macd, atrPercent, trend.",
      inputSchema: indicatorInputSchema,
      execute: async (input) => {
        return this.traceTool(agentName, "calculate_indicator", input, async () => {
          const scoped = this.assertScopedInput(input);
          const indicator = input.indicator as IndicatorName;
          const cacheKey = `${scoped.ticker}:${scoped.timeframe}:${indicator}`;
          const cached =
            this.indicatorCache.get(cacheKey) ??
            this.priceService.calculateIndicator(scoped.ticker, scoped.timeframe, indicator);
          this.indicatorCache.set(cacheKey, cached);
          return cached;
        });
      },
    });
  }

  private assertScopedInput(input: z.infer<typeof scopedTickerSchema>) {
    const ticker = input.ticker.toUpperCase();
    const timeframe = input.timeframe ?? this.context.timeframe;

    if (ticker !== this.context.ticker.toUpperCase()) {
      throw new Error(`Tool ticker ${ticker} does not match run ticker ${this.context.ticker}`);
    }
    if (timeframe !== this.context.timeframe) {
      throw new Error(
        `Tool timeframe ${timeframe} does not match run timeframe ${this.context.timeframe}`
      );
    }

    return { ticker, timeframe };
  }

  private async traceTool<TOutput>(
    agentName: string,
    toolName: string,
    input: Record<string, unknown>,
    execute: () => Promise<TOutput>
  ): Promise<TOutput> {
    const calledAt = new Date().toISOString();

    try {
      const output = await execute();
      this.trace.push({
        agentName,
        toolName,
        input,
        outputSummary: this.summarizeOutput(toolName, output),
        calledAt,
      });
      return output;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.trace.push({
        agentName,
        toolName,
        input,
        outputSummary: "Tool call failed.",
        calledAt,
        error: message,
      });
      throw error;
    }
  }

  private summarizeOutput(toolName: string, output: unknown): string {
    if (toolName === "get_price_snapshot") {
      const snapshot = output as LeanPriceSnapshot;
      return `Price ${snapshot.snapshot.c}, ${snapshot.recentCandles.length} recent candles, SMA10 ${snapshot.derivedFeatures.sma10}, SMA30 ${snapshot.derivedFeatures.sma30}.`;
    }
    if (toolName === "get_company_news") {
      const news = output as { count?: number };
      return `${news.count ?? 0} recent news articles returned.`;
    }
    if (toolName === "calculate_indicator") {
      const indicator = output as IndicatorResult;
      return `${indicator.indicator}: ${JSON.stringify(indicator.value)}`;
    }

    return JSON.stringify(output).slice(0, 240);
  }
}

export const agentToolSchemas = {
  scopedTickerSchema,
  indicatorInputSchema,
};
