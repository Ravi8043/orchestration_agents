import { z } from "zod";
import { logger } from "../../../config/logger.js";
import { env } from "../../../config/env.js";
import type {
    AgentEvidence,
    AgentOutput,
    AnalysisContext,
    ToolTraceEntry,
} from "../../../types/analysis.types.js";
import type { AgentToolFactory } from "../tools/agent-tool.factory.js";
import { ProviderFactory } from "../../../factories/provider.factory.js";

const aiProvider = new ProviderFactory();

// ─── Configuration ───────────────────────────────────────────────────────────

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TEMPERATURE = 0.4;

export interface AgentIdentity {
    /** Display name used in logs and output (e.g. "MomentumTrader") */
    name: string;
    /** Role description stored alongside output (e.g. "momentum-trader") */
    role: string;
}

export interface AgentRunContext {
    /** The full system prompt (persona + instructions) */
    systemPrompt: string;
    /** The user-facing data prompt (dataset serialized for the LLM) */
    userPrompt: string;
    /** Optional temperature override (0-1) */
    temperature?: number;
    /** Optional max retries override */
    maxRetries?: number;
}

export interface AgentPromptContext {
    systemPrompt: string;
    evidencePrompt: string;
    revisionPrompt: (input: {
        originalEvidence: string;
        peerSummaries: string;
    }) => string;
    temperature?: number;
}

// ─── Abstract Base Agent ─────────────────────────────────────────────────────

/**
 * Encapsulates all shared AI behaviour for the multi-agent system.
 *
 * Subclasses only need to implement:
 *   - `identity`      — who this agent is
 *   - `outputSchema`  — Zod schema describing the structured output
 *   - `buildContext`  — turn an AnalysisDataset into prompts
 *
 * The base class handles:
 *   - model instantiation
 *   - structured generation via `generateObject()`
 *   - logging
 *   - error handling & retries
 */
export abstract class BaseAgent<TOutput> {
    // ── Abstract contract ────────────────────────────────────────────────────

    /** Agent identity (name + role). */
    abstract readonly identity: AgentIdentity;

    /** Zod schema that the LLM must conform to. */
    abstract readonly outputSchema: z.ZodType<TOutput>;

    abstract buildPromptContext(context: AnalysisContext): AgentPromptContext;

    // ── Structured generation ────────────────────────────────────────────────

    /**
     * Execute a structured-output generation call against the configured model.
     *
     * @param context - System + user prompts and optional overrides.
     * @returns The validated, typed output object.
     */
    protected async generate(context: AgentRunContext): Promise<{ object: TOutput; provider: string; degraded: boolean; fallbackReason?: string }> {
        const { name, role } = this.identity;
        const temperature = context.temperature ?? DEFAULT_TEMPERATURE;
        const maxRetries = context.maxRetries ?? DEFAULT_MAX_RETRIES;

        logger.info({ agent: name, role }, "Agent generation started");

        const startMs = Date.now();

        try {
            const result = await aiProvider.generateObject({
                agentName: name,
                schema: this.outputSchema,
                system: context.systemPrompt,
                prompt: context.userPrompt,
                temperature,
                maxRetries,
                maxTokens: 150,
            });

            const durationMs = Date.now() - startMs;
            logger.info(
                { agent: name, durationMs, degraded: result.degraded },
                "Agent generation completed"
            );

            return result;
        } catch (error) {
            const durationMs = Date.now() - startMs;
            logger.error(
                { agent: name, durationMs, err: error },
                "Agent generation failed"
            );
            throw error;
        }
    }

    async analyze(
        context: AnalysisContext,
        toolFactory: AgentToolFactory
    ): Promise<AgentOutput> {
        const promptContext = this.buildPromptContext(context);
        const traceStart = toolFactory.getTrace().length;

        const evidenceLoop = await this.runToolLoop({
            systemPrompt: promptContext.systemPrompt,
            prompt: promptContext.evidencePrompt,
            tools: toolFactory.createSpecialistTools(this.identity.name),
            temperature: promptContext.temperature ?? DEFAULT_TEMPERATURE,
        });

        const toolCalls = toolFactory.getTrace().slice(traceStart);
        const finalizeResult = await this.finalizeSpecialistOutput(context, evidenceLoop.text, toolCalls);

        const degraded = evidenceLoop.degraded || finalizeResult.degraded;
        const fallbackReason = evidenceLoop.fallbackReason || finalizeResult.fallbackReason;

        return this.toAgentOutput(finalizeResult.object, toolCalls, evidenceLoop.provider, degraded, fallbackReason);
    }

    async revise(
        context: AnalysisContext,
        originalOutput: AgentOutput,
        peerOutputs: AgentOutput[],
        toolFactory: AgentToolFactory
    ): Promise<AgentOutput> {
        const promptContext = this.buildPromptContext(context);
        const traceStart = toolFactory.getTrace().length;
        const peerSummaries = peerOutputs
            .map(
                (output) =>
                    `${output.name} (${output.role}): ${output.action}, score ${output.score}, confidence ${output.confidence}. Evidence: ${output.evidence.map((e) => e.summary).join(" | ")}`
            )
            .join("\n");

        const revisionLoop = await this.runToolLoop({
            systemPrompt: promptContext.systemPrompt,
            prompt: promptContext.revisionPrompt({
                originalEvidence: JSON.stringify(originalOutput, null, 2),
                peerSummaries,
            }),
            tools: toolFactory.createSpecialistTools(this.identity.name),
            temperature: promptContext.temperature ?? DEFAULT_TEMPERATURE,
        });

        const additionalToolCalls = toolFactory.getTrace().slice(traceStart);
        const allToolCalls = [...originalOutput.toolCalls, ...additionalToolCalls];
        const finalizeResult = await this.finalizeSpecialistOutput(context, revisionLoop.text, allToolCalls);

        const degraded = originalOutput.degraded || revisionLoop.degraded || finalizeResult.degraded;
        const fallbackReason = revisionLoop.fallbackReason || finalizeResult.fallbackReason || originalOutput.fallbackReason;

        return {
            ...this.toAgentOutput(finalizeResult.object, allToolCalls, revisionLoop.provider, degraded, fallbackReason),
            revisionNotes: revisionLoop.text.slice(0, 1000),
        };
    }

    protected async runToolLoop(input: {
        systemPrompt: string;
        prompt: string;
        tools: Record<string, unknown>;
        temperature: number;
    }): Promise<{ text: string; provider: string; degraded: boolean; fallbackReason?: string }> {
        const { name, role } = this.identity;
        const startMs = Date.now();
        logger.info({ agent: name, role }, "Agent tool loop started");

        const result = await aiProvider.generateText({
            agentName: name,
            system: input.systemPrompt,
            prompt: input.prompt,
            tools: input.tools,
            temperature: input.temperature,
            maxRetries: DEFAULT_MAX_RETRIES,
            maxTokens: 1000,
        });

        logger.info(
            { agent: name, durationMs: Date.now() - startMs, provider: result.provider },
            "Agent tool loop completed"
        );

        return result;
    }

    private async finalizeSpecialistOutput(
        context: AnalysisContext,
        evidenceText: string,
        toolCalls: ToolTraceEntry[]
    ): Promise<{ object: TOutput; provider: string; degraded: boolean; fallbackReason?: string }> {
        const result = await aiProvider.generateObject({
            agentName: this.identity.name,
            schema: this.outputSchema,
            system:
                "Convert the agent's evidence notes into the required structured output. Do not invent evidence. If evidence is thin, lower confidence and say so.",
            prompt: `Run context: ${JSON.stringify(context)}

Tool evidence summaries:
${toolCalls.map((call) => `- ${call.toolName}: ${call.outputSummary}`).join("\n") || "- No tools were called."}

Agent evidence notes:
${evidenceText}`,
            temperature: 0.2,
            maxRetries: DEFAULT_MAX_RETRIES,
            maxTokens: 900,
        });

        return result;
    }

    private toAgentOutput(
        result: TOutput,
        toolCalls: ToolTraceEntry[],
        provider: string,
        degraded?: boolean,
        fallbackReason?: string
    ): AgentOutput {
        const output = result as any;
        const evidence: AgentEvidence[] = toolCalls.length
            ? toolCalls.map((call) => ({
                toolName: call.toolName,
                summary: call.outputSummary,
                usedFor: this.inferEvidenceUse(call.toolName),
            }))
            : [
                {
                    toolName: "none",
                    summary: "No tool evidence recorded.",
                    usedFor: "confidence penalty",
                },
            ];

        return {
            name: this.identity.name,
            role: this.identity.role,
            action: output.action,
            score: output.score,
            confidence: output.confidence,
            reasoning: output.reasoning,
            bullCase: output.bullCase,
            bearCase: output.bearCase,
            keyRisks: output.keyRisks,
            keyData: output.keyData,
            evidence,
            toolCalls,
            provider,
            degraded,
            fallbackReason,
        };
    }

    private inferEvidenceUse(toolName: string): string {
        if (toolName === "get_price_snapshot") return "price context";
        if (toolName === "get_company_news") return "news and narrative context";
        if (toolName === "calculate_indicator") return "optional indicator validation";
        return "supporting evidence";
    }
}
