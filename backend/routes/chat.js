import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { getOrCreateConversation, getConversationMessages } from "../controllers/chatController.js";

const router = express.Router();
router.post("/conversation", verifyToken, getOrCreateConversation);
router.get("/:conversationId/messages", verifyToken, getConversationMessages);

export default router;
