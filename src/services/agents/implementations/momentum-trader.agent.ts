import { BaseAgent } from "../base/base-agent.js";
import type { AgentIdentity, AgentPromptContext } from "../base/base-agent.js";
import { specialistOutputSchema, type SpecialistOutput } from "../schemas/agent.schemas.js";
import {
  buildMomentumTraderRevisionPrompt,
  buildMomentumTraderSystemPrompt,
  buildMomentumTraderEvidencePrompt,
} from "../prompts/momentum-trader.prompt.js";
import type { AnalysisContext } from "../../../types/analysis.types.js";

export class MomentumTraderAgent extends BaseAgent<SpecialistOutput> {
  readonly identity: AgentIdentity = {
    name: "MomentumTrader",
    role: "momentum-trader",
  };

  readonly outputSchema = specialistOutputSchema;

  buildPromptContext(context: AnalysisContext): AgentPromptContext {
    return {
      systemPrompt: buildMomentumTraderSystemPrompt(),
      evidencePrompt: buildMomentumTraderEvidencePrompt(context),
      revisionPrompt: buildMomentumTraderRevisionPrompt,
      temperature: 0.4,
    };
  }
}
