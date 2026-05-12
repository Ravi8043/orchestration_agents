import { BaseAgent } from "../base/base-agent.js";
import type { AgentIdentity, AgentPromptContext } from "../base/base-agent.js";
import { specialistOutputSchema, type SpecialistOutput } from "../schemas/agent.schemas.js";
import {
  buildContrarianRevisionPrompt,
  buildContrarianSystemPrompt,
  buildContrarianEvidencePrompt,
} from "../prompts/contrarian.prompt.js";
import type { AnalysisContext } from "../../../types/analysis.types.js";

export class ContrarianAgent extends BaseAgent<SpecialistOutput> {
  readonly identity: AgentIdentity = {
    name: "Contrarian",
    role: "contrarian-analyst",
  };

  readonly outputSchema = specialistOutputSchema;

  buildPromptContext(context: AnalysisContext): AgentPromptContext {
    return {
      systemPrompt: buildContrarianSystemPrompt(),
      evidencePrompt: buildContrarianEvidencePrompt(context),
      revisionPrompt: buildContrarianRevisionPrompt,
      temperature: 0.5, // slightly higher creativity for contrarian thinking
    };
  }
}
