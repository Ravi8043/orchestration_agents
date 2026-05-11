import { logger } from "../../config/logger.js";
import { MomentumTraderAgent } from "./implementations/momentum-trader.agent.js";
import { ValueInvestorAgent } from "./implementations/value-investor.agent.js";
import { ContrarianAgent } from "./implementations/contrarian.agent.js";
import { ModeratorAgent } from "./implementations/moderator.agent.js";
import type {
  AnalysisDataset,
  AgentOutput,
  OrchestratorResult,
} from "../../types/analysis.types.js";

/**
 * OrchestratorService — pure workflow coordinator.
 *
 * Responsibilities:
 *   1. Instantiate specialist agents
 *   2. Run specialists concurrently against the dataset
 *   3. Collect outputs
 *   4. Pass all outputs to the moderator for consensus
 *   5. Return the structured result for persistence
 *
 * This service performs NO reasoning, scoring, or synthesis itself.
 * All intelligence lives in the agent layer.
 */
export class OrchestratorService {
  private readonly momentumTrader = new MomentumTraderAgent();
  private readonly valueInvestor = new ValueInvestorAgent();
  private readonly contrarian = new ContrarianAgent();
  private readonly moderator = new ModeratorAgent();

  async run(dataset: AnalysisDataset): Promise<OrchestratorResult> {
    const { ticker } = dataset;
    logger.info({ ticker }, "Orchestrator: starting multi-agent analysis");

    const startMs = Date.now();

    // ── Phase 1: Run specialist agents concurrently ──────────────────────
    logger.info({ ticker }, "Orchestrator: dispatching specialist agents");

    const specialistResults = [];
    const agentsToRun = [
      this.momentumTrader,
      this.valueInvestor,
      this.contrarian,
    ];

    for (const agent of agentsToRun) {
      try {
        const result = await agent.analyze(dataset);
        specialistResults.push({ status: "fulfilled" as const, value: result });
      } catch (error) {
        specialistResults.push({ status: "rejected" as const, reason: error });
      }
    }

    const agentOutputs: AgentOutput[] = [];
    const failures: string[] = [];

    for (const result of specialistResults) {
      if (result.status === "fulfilled") {
        agentOutputs.push(result.value);
      } else {
        const errorMsg =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        failures.push(errorMsg);
        logger.error(
          { err: result.reason, ticker },
          "Orchestrator: specialist agent failed"
        );
      }
    }

    // Require at least 2 specialist outputs to form meaningful consensus
    if (agentOutputs.length < 2) {
      const errorDetail = `Only ${agentOutputs.length} of 3 specialists succeeded. Failures: ${failures.join("; ")}`;
      logger.error({ ticker, failures }, "Orchestrator: insufficient specialist outputs");
      throw new Error(`Orchestration failed: ${errorDetail}`);
    }

    logger.info(
      {
        ticker,
        successCount: agentOutputs.length,
        failCount: failures.length,
        agents: agentOutputs.map((a) => a.name),
      },
      "Orchestrator: specialist phase complete"
    );

    // ── Phase 2: Moderator synthesis ─────────────────────────────────────
    logger.info({ ticker }, "Orchestrator: dispatching moderator agent");

    const consensus = await this.moderator.synthesize(dataset, agentOutputs);

    const totalDurationMs = Date.now() - startMs;
    logger.info(
      {
        ticker,
        totalDurationMs,
        consensusAction: consensus.action,
        consensusScore: consensus.score,
        consensusConfidence: consensus.confidence,
      },
      "Orchestrator: analysis complete"
    );

    return { agentOutputs, consensus };
  }
}
