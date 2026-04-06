import { Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env.js";
import { AppError } from "../lib/errors/app-error.js";

// Initialize Gemini SDK
const genAI = new GoogleGenerativeAI(env.GOOGLE_API_KEY || "");
// Use Gemini 1.5 Flash (or your preferred Gemini model)
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export const chatController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body;
    
    if (!message) {
      throw new AppError("Message is required in request body", 400);
    }
    if (!env.GOOGLE_API_KEY) {
      throw new AppError("Google API Key is missing in environment variables", 500);
    }

    // Explicitly limit maximum output tokens to 100 as per your request
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: message }] }],
      generationConfig: {
        maxOutputTokens: 100,
      }
    });

    res.json({
      success: true,
      data: {
        reply: result.response.text(),
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    
    console.error("Chat Error:", error);
    res.status(500).json({ error: "Internal server error during chat processing" });
  }
};
