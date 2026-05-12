import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
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

const googleProvider = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY || "",
});

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
    const moderationNotes = await this.runToolLoop({
      systemPrompt: buildModeratorSystemPrompt(),
      prompt: buildModeratorEvidencePrompt(context, agentOutputs),
      tools: toolFactory.createModeratorTools(this.identity.name),
      temperature: 0.3,
    });
    const toolCalls = toolFactory.getTrace().slice(traceStart);

    const { object: result } = await generateObject({
      model: googleProvider("gemini-2.0-flash"),
      schema: this.outputSchema,
      system:
        "Convert moderation notes into the required consensus schema. Do not invent evidence. Key risks and reasoning must reflect evidence-backed and weak claims.",
      prompt: `Run context: ${JSON.stringify(context)}

Specialist outputs:
${JSON.stringify(agentOutputs, null, 2)}

Moderator tool calls:
${this.summarizeToolCalls(toolCalls)}

Moderation notes:
${moderationNotes}`,
      temperature: 0.2,
      maxRetries: 2,
      maxOutputTokens: 1000,
    });

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

  private summarizeToolCalls(toolCalls: ToolTraceEntry[]): string {
    if (toolCalls.length === 0) return "No moderator verification tools were called.";
    return toolCalls.map((call) => `- ${call.toolName}: ${call.outputSummary}`).join("\n");
  }
}
