import { BaseAgent } from "../base/base-agent.js";
import type { AgentIdentity, AgentPromptContext } from "../base/base-agent.js";
import { specialistOutputSchema, type SpecialistOutput } from "../schemas/agent.schemas.js";
import {
  buildValueInvestorRevisionPrompt,
  buildValueInvestorSystemPrompt,
  buildValueInvestorEvidencePrompt,
} from "../prompts/value-investor.prompt.js";
import type { AnalysisContext } from "../../../types/analysis.types.js";

export class ValueInvestorAgent extends BaseAgent<SpecialistOutput> {
  readonly identity: AgentIdentity = {
    name: "ValueInvestor",
    role: "value-investor",
  };

  readonly outputSchema = specialistOutputSchema;

  buildPromptContext(context: AnalysisContext): AgentPromptContext {
    return {
      systemPrompt: buildValueInvestorSystemPrompt(),
      evidencePrompt: buildValueInvestorEvidencePrompt(context),
      revisionPrompt: buildValueInvestorRevisionPrompt,
      temperature: 0.3,
    };
  }
}
