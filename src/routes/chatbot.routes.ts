import { Router } from "express";
import { chatController } from "../controllers/chatbot.controller.js";

export const chatbotRouter = Router();

chatbotRouter.post("/chat", chatController);
