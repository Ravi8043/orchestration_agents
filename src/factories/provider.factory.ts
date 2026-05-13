import { z } from "zod";
import { GeminiProvider } from "../providers/gemini.provider.js";
import { MockProvider } from "../providers/mock.provider.js";
import { isQuotaError } from "../utils/is-quota-error.js";
import { logger } from "../config/logger.js";

export interface GenerateObjectOptions<T> {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  temperature?: number;
  maxRetries?: number;
  maxTokens?: number;
  agentName: string;
}

export interface GenerateTextOptions {
  system: string;
  prompt: string;
  tools?: Record<string, unknown>;
  temperature?: number;
  maxRetries?: number;
  maxTokens?: number;
  agentName: string;
}

export interface AiProvider {
  generateObject<T>(options: GenerateObjectOptions<T>): Promise<{ object: T; provider: string }>;
  generateText(options: GenerateTextOptions): Promise<{ text: string; provider: string }>;
}

export class ProviderFactory {
  private primaryProvider: AiProvider;
  private fallbackProvider: AiProvider;

  constructor() {
    this.primaryProvider = new GeminiProvider();
    this.fallbackProvider = new MockProvider();
  }

  async generateObject<T>(
    options: GenerateObjectOptions<T>
  ): Promise<{ object: T; provider: string; degraded: boolean; fallbackReason?: string }> {
    try {
      const result = await this.primaryProvider.generateObject(options);
      return { ...result, degraded: false };
    } catch (error) {
      if (isQuotaError(error)) {
        logger.warn(
          { agent: options.agentName, err: error },
          "Gemini quota exceeded, activating fallback mock provider for object generation"
        );
        const fallbackResult = await this.fallbackProvider.generateObject(options);
        return { ...fallbackResult, degraded: true, fallbackReason: "Gemini quota exceeded" };
      }
      throw error;
    }
  }

  async generateText(
    options: GenerateTextOptions
  ): Promise<{ text: string; provider: string; degraded: boolean; fallbackReason?: string }> {
    try {
      const result = await this.primaryProvider.generateText(options);
      return { ...result, degraded: false };
    } catch (error) {
      if (isQuotaError(error)) {
        logger.warn(
          { agent: options.agentName, err: error },
          "Gemini quota exceeded, activating fallback mock provider for text generation"
        );
        const fallbackResult = await this.fallbackProvider.generateText(options);
        return { ...fallbackResult, degraded: true, fallbackReason: "Gemini quota exceeded" };
      }
      throw error;
    }
  }
}
