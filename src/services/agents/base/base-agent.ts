import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { logger } from "../../../config/logger.js";
import { env } from "../../../config/env.js";

const googleProvider = createGoogleGenerativeAI({
    apiKey: env.GOOGLE_API_KEY || "",
});

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

    /** Build the system and user prompts from input data. */
    abstract buildContext(...args: unknown[]): AgentRunContext;

    // ── Structured generation ────────────────────────────────────────────────

    /**
     * Execute a structured-output generation call against the configured model.
     *
     * @param context - System + user prompts and optional overrides.
     * @returns The validated, typed output object.
     */
    protected async generate(context: AgentRunContext): Promise<TOutput> {
        const { name, role } = this.identity;
        const temperature = context.temperature ?? DEFAULT_TEMPERATURE;
        const maxRetries = context.maxRetries ?? DEFAULT_MAX_RETRIES;

        logger.info({ agent: name, role }, "Agent generation started");

        const startMs = Date.now();

        try {
            const { object } = await generateObject({
                model: googleProvider(DEFAULT_MODEL),
                schema: this.outputSchema,
                system: context.systemPrompt,
                prompt: context.userPrompt,
                temperature,
                maxRetries,
                maxTokens: 150,
            });

            const durationMs = Date.now() - startMs;
            logger.info(
                { agent: name, durationMs },
                "Agent generation completed"
            );

            return object;
        } catch (error) {
            const durationMs = Date.now() - startMs;
            logger.error(
                { agent: name, durationMs, err: error },
                "Agent generation failed"
            );
            throw error;
        }
    }
}