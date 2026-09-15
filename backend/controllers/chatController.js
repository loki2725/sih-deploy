import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Messages.js";

export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ error: "participantId is required" });
    if (participantId === req.user.id) return res.status(400).json({ error: "Cannot create a conversation with yourself" });

    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, participantId],
      });
    }

    res.json(conversation);
  } catch (error) {
    next(error);
  }
};

export const getConversationMessages = async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user.id,
    });

    if (!conversation) return res.status(403).json({ error: "Not authorized to access this conversation" });

    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
};
