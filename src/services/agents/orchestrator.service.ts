import { logger } from "../../config/logger.js";
import { MomentumTraderAgent } from "./implementations/momentum-trader.agent.js";
import { ValueInvestorAgent } from "./implementations/value-investor.agent.js";
import { ContrarianAgent } from "./implementations/contrarian.agent.js";
import { ModeratorAgent } from "./implementations/moderator.agent.js";
import { AgentToolFactory } from "./tools/agent-tool.factory.js";

import type {
  AgentOutput,
  AnalysisContext,
  DebateTraceEntry,
  OrchestratorResult,
  ToolTraceEntry,
} from "../../types/analysis.types.js";

type SpecialistAgent = {
  identity: { name: string; role: string };
  analyze: (context: AnalysisContext, toolFactory: AgentToolFactory) => Promise<AgentOutput>;
  revise: (
    context: AnalysisContext,
    originalOutput: AgentOutput,
    peerOutputs: AgentOutput[],
    toolFactory: AgentToolFactory
  ) => Promise<AgentOutput>;
};

type Moderator = {
  identity: { name: string; role: string };
  synthesize: (
    context: AnalysisContext,
    agentOutputs: AgentOutput[],
    toolFactory: AgentToolFactory
  ) => Promise<OrchestratorResult["consensus"]>;
};

export class OrchestratorService {
  private readonly agentsToRun: SpecialistAgent[];
  private readonly moderator: Moderator;
  private readonly createToolFactory: (
    context: AnalysisContext,
    trace: ToolTraceEntry[]
  ) => AgentToolFactory;
  //here in options you can pass custom agents if not it will use the default ones
  //same for the moderator and tool factory
  constructor(options: {
    agents?: SpecialistAgent[];
    moderator?: Moderator;
    createToolFactory?: (context: AnalysisContext, trace: ToolTraceEntry[]) => AgentToolFactory;
  } = {}) {
    this.agentsToRun = options.agents ?? [
      new MomentumTraderAgent(),
      new ValueInvestorAgent(),
      new ContrarianAgent(),
    ];
    this.moderator = options.moderator ?? new ModeratorAgent();
    this.createToolFactory =
      options.createToolFactory ?? ((ctx, trace) => new AgentToolFactory(ctx, trace));
  }

  async run(context: AnalysisContext): Promise<OrchestratorResult> {
    const { ticker } = context;
    const toolTrace: OrchestratorResult["toolTrace"] = []; //what tool was called and what it returned
    const debateTrace: DebateTraceEntry[] = []; //what reasoning agent gave in debate
    const toolFactory = this.createToolFactory(context, toolTrace);

    logger.info({ ticker, runId: context.runId }, "Orchestrator: starting agentic analysis");
    const startMs = Date.now();
    //agentsToRun instantiates agents and uses analyze and revise methods
    //Promise.allSettled runs all agents in parallel
    const evidenceResults = await Promise.allSettled(
      this.agentsToRun.map((agent) => agent.analyze(context, toolFactory))
    );

    const firstPassOutputs: AgentOutput[] = [];
    const failures: string[] = [];

    for (const result of evidenceResults) {
      if (result.status === "fulfilled") {
        firstPassOutputs.push(result.value);
        debateTrace.push(this.createDebateTrace(result.value.name, "evidence", result.value.reasoning));
      } else {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failures.push(message);
        logger.error({ ticker, err: result.reason }, "Orchestrator: evidence phase failed");
      }
    }

    if (firstPassOutputs.length < 2) {
      throw new Error(
        `Orchestration failed: only ${firstPassOutputs.length} of 3 specialists completed evidence phase. Failures: ${failures.join("; ")}`
      );
    }

    const revisionResults = await Promise.allSettled(
      firstPassOutputs.map((output) => {
        const agent = this.agentsToRun.find((candidate) => candidate.identity.name === output.name);
        if (!agent) return Promise.resolve(output);
        const peers = firstPassOutputs.filter((peer) => peer.name !== output.name);
        return agent.revise(context, output, peers, toolFactory);
      })
    );

    const revisedOutputs: AgentOutput[] = [];
    for (const result of revisionResults) {
      if (result.status === "fulfilled") {
        revisedOutputs.push(result.value);
        debateTrace.push(
          this.createDebateTrace(
            result.value.name,
            "revision",
            result.value.revisionNotes ?? result.value.reasoning
          )
        );
      } else {
        const message = result.reason instanceof Error ? result.reason.message : String(result.reason);
        failures.push(message);
        logger.error({ ticker, err: result.reason }, "Orchestrator: revision phase failed");
      }
    }

    if (revisedOutputs.length < 2) {
      throw new Error(
        `Orchestration failed: only ${revisedOutputs.length} specialists completed revision phase. Failures: ${failures.join("; ")}`
      );
    }

    const consensus = await this.moderator.synthesize(context, revisedOutputs, toolFactory);
    debateTrace.push(
      this.createDebateTrace(
        this.moderator.identity.name,
        "moderation",
        `${consensus.action} with confidence ${consensus.confidence}. ${consensus.reasoning}`
      )
    );

    logger.info(
      {
        ticker,
        runId: context.runId,
        totalDurationMs: Date.now() - startMs,
        consensusAction: consensus.action,
        consensusConfidence: consensus.confidence,
        toolCallCount: toolTrace.length,
      },
      "Orchestrator: agentic analysis complete"
    );

    return {
      agentOutputs: revisedOutputs,
      consensus,
      toolTrace,
      debateTrace,
    };
  }

  private createDebateTrace(
    agentName: string,
    phase: DebateTraceEntry["phase"],
    summary: string
  ): DebateTraceEntry {
    return {
      agentName,
      phase,
      summary: summary.slice(0, 1200),
      createdAt: new Date().toISOString(),
    };
  }
}
