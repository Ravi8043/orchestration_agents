import { generateObject, generateText, stepCountIs } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { env } from "../config/env.js";
import type { AiProvider, GenerateObjectOptions, GenerateTextOptions } from "../factories/provider.factory.js";

const googleProvider = createGoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY || "",
});

const DEFAULT_MODEL = "gemini-2.0-flash";
const DEFAULT_MAX_RETRIES = 2;

export class GeminiProvider implements AiProvider {
  async generateObject<T>(options: GenerateObjectOptions<T>): Promise<{ object: T; provider: string }> {
    const { object } = await generateObject({
      model: googleProvider(DEFAULT_MODEL),
      schema: options.schema,
      system: options.system,
      prompt: options.prompt,
      temperature: options.temperature,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      maxTokens: options.maxTokens,
    });
    return { object, provider: "gemini" };
  }

  async generateText(options: GenerateTextOptions): Promise<{ text: string; provider: string }> {
    const result = await generateText({
      model: googleProvider(DEFAULT_MODEL),
      system: options.system,
      prompt: options.prompt,
      tools: options.tools as any,
      toolChoice: options.tools ? "auto" : undefined,
      stopWhen: options.tools ? stepCountIs(5) : undefined,
      temperature: options.temperature,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      ...(options.maxTokens && { maxTokens: options.maxTokens } as any),
    });
    return { text: result.text, provider: "gemini" };
  }
}
