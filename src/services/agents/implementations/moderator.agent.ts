import { BaseAgent } from "../base/base-agent.js";
import type { AgentIdentity, AgentRunContext } from "../base/base-agent.js";
import { consensusOutputSchema, type ConsensusOutput } from "../schemas/agent.schemas.js";
import {
  buildModeratorSystemPrompt,
  buildModeratorUserPrompt,
} from "../prompts/moderator.prompt.js";
import type {
  AnalysisDataset,
  AgentOutput,
  ConsensusData,
} from "../../../types/analysis.types.js";

export class ModeratorAgent extends BaseAgent<ConsensusOutput> {
  readonly identity: AgentIdentity = {
    name: "ChiefModerator",
    role: "moderator-risk-manager",
  };

  readonly outputSchema = consensusOutputSchema;

  buildContext(
    dataset: AnalysisDataset,
    agentOutputs: AgentOutput[]
  ): AgentRunContext {
    return {
      systemPrompt: buildModeratorSystemPrompt(),
      userPrompt: buildModeratorUserPrompt(dataset, agentOutputs),
      temperature: 0.3, // lower temperature for decisive consensus
    };
  }

  /**
   * Synthesize all specialist outputs into a final consensus.
   */
  async synthesize(
    dataset: AnalysisDataset,
    agentOutputs: AgentOutput[]
  ): Promise<ConsensusData> {
    const context = this.buildContext(dataset, agentOutputs);
    const result = await this.generate(context);

    return {
      action: result.action,
      score: result.score,
      confidence: result.confidence,
      allocation: result.allocation,
      riskLevel: result.riskLevel,
      reasoning: result.reasoning,
      stopLoss: result.stopLoss,
      takeProfit: result.takeProfit,
      timeHorizon: result.timeHorizon,
      keyRisks: result.keyRisks,
      analystWeightsUsed: result.analystWeightsUsed,
      disagreements: result.disagreements,
    };
  }
}
