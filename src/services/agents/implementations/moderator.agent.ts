import { BaseAgent } from "../base/base-agent.js";
import type { AgentIdentity, AgentPromptContext } from "../base/base-agent.js";
import { consensusOutputSchema, type ConsensusOutput } from "../schemas/agent.schemas.js";
import {
  buildModeratorEvidencePrompt,
  buildModeratorSystemPrompt,
} from "../prompts/moderator.prompt.js";
import { env } from "../../../config/env.js";
import type {
  AgentOutput,
  AnalysisContext,
  ConsensusData,
  ToolTraceEntry,
} from "../../../types/analysis.types.js";
import type { AgentToolFactory } from "../tools/agent-tool.factory.js";
import { ProviderFactory } from "../../../factories/provider.factory.js";

const aiProvider = new ProviderFactory();

export class ModeratorAgent extends BaseAgent<ConsensusOutput> {
  readonly identity: AgentIdentity = {
    name: "ChiefModerator",
    role: "moderator-risk-manager",
  };

  readonly outputSchema = consensusOutputSchema;

  buildPromptContext(context: AnalysisContext): AgentPromptContext {
    return {
      systemPrompt: buildModeratorSystemPrompt(),
      evidencePrompt: `Moderate ${context.ticker}.`,
      revisionPrompt: () => "No moderator revision prompt.",
      temperature: 0.3, // lower temperature for decisive consensus
    };
  }

  /**
   * Synthesize all specialist outputs into a final consensus.
   */
  async synthesize(
    context: AnalysisContext,
    agentOutputs: AgentOutput[],
    toolFactory: AgentToolFactory
  ): Promise<ConsensusData> {
    const traceStart = toolFactory.getTrace().length;
    const moderationLoop = await this.runToolLoop({
      systemPrompt: buildModeratorSystemPrompt(),
      prompt: buildModeratorEvidencePrompt(context, agentOutputs),
      tools: toolFactory.createModeratorTools(this.identity.name),
      temperature: 0.3,
    });
    const toolCalls = toolFactory.getTrace().slice(traceStart);

    const result = await aiProvider.generateObject({
      agentName: this.identity.name,
      schema: this.outputSchema,
      system:
        "Convert moderation notes into the required consensus schema. Do not invent evidence. Key risks and reasoning must reflect evidence-backed and weak claims.",
      prompt: `Run context: ${JSON.stringify(context)}

Specialist outputs:
${JSON.stringify(agentOutputs, null, 2)}

Moderator tool calls:
${this.summarizeToolCalls(toolCalls)}

Moderation notes:
${moderationLoop.text}`,
      temperature: 0.2,
      maxRetries: 2,
      maxTokens: 1000,
    });

    const anyAgentDegraded = agentOutputs.some((o) => o.degraded);
    const degraded = moderationLoop.degraded || result.degraded || anyAgentDegraded;
    const fallbackReason = moderationLoop.fallbackReason || result.fallbackReason;

    return {
      action: result.object.action,
      score: result.object.score,
      confidence: result.object.confidence,
      allocation: result.object.allocation,
      riskLevel: result.object.riskLevel,
      reasoning: result.object.reasoning,
      stopLoss: result.object.stopLoss,
      takeProfit: result.object.takeProfit,
      timeHorizon: result.object.timeHorizon,
      keyRisks: result.object.keyRisks,
      analystWeightsUsed: result.object.analystWeightsUsed,
      disagreements: result.object.disagreements,
      provider: result.provider,
      degraded,
      fallbackReason,
    };
  }

  private summarizeToolCalls(toolCalls: ToolTraceEntry[]): string {
    if (toolCalls.length === 0) return "No moderator verification tools were called.";
    return toolCalls.map((call) => `- ${call.toolName}: ${call.outputSummary}`).join("\n");
  }
}
