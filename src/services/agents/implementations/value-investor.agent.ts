import { BaseAgent } from "../base/base-agent.js";
import type { AgentIdentity, AgentRunContext } from "../base/base-agent.js";
import { specialistOutputSchema, type SpecialistOutput } from "../schemas/agent.schemas.js";
import {
  buildValueInvestorSystemPrompt,
  buildValueInvestorUserPrompt,
} from "../prompts/value-investor.prompt.js";
import type { AnalysisDataset, AgentOutput } from "../../../types/analysis.types.js";

export class ValueInvestorAgent extends BaseAgent<SpecialistOutput> {
  readonly identity: AgentIdentity = {
    name: "ValueInvestor",
    role: "value-investor",
  };

  readonly outputSchema = specialistOutputSchema;

  buildContext(dataset: AnalysisDataset): AgentRunContext {
    return {
      systemPrompt: buildValueInvestorSystemPrompt(),
      userPrompt: buildValueInvestorUserPrompt(dataset),
      temperature: 0.3,
    };
  }

  /**
   * Run this agent against a dataset and return a normalized AgentOutput.
   */
  async analyze(dataset: AnalysisDataset): Promise<AgentOutput> {
    const context = this.buildContext(dataset);
    const result = await this.generate(context);

    return {
      name: this.identity.name,
      role: this.identity.role,
      action: result.action,
      score: result.score,
      confidence: result.confidence,
      reasoning: result.reasoning,
      bullCase: result.bullCase,
      bearCase: result.bearCase,
      keyRisks: result.keyRisks,
      keyData: result.keyData,
    };
  }
}
