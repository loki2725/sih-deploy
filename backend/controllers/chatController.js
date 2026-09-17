import { Conversation } from "../models/Conversation.js";
import { Message } from "../models/Messages.js";
import { User } from "../models/User.js";

export const getOrCreateConversation = async (req, res, next) => {
  try {
    const { participantId } = req.body;
    if (!participantId) return res.status(400).json({ error: "participantId is required" });
    if (participantId === req.user.id) return res.status(400).json({ error: "Cannot create a conversation with yourself" });

    const otherUser = await User.findById(participantId).select("role linkedDoctor linkedPatients");
    if (!otherUser) return res.status(404).json({ error: "User not found" });

    const currentUser = await User.findById(req.user.id).select("role linkedDoctor linkedPatients");
    const isPatientDoctorPair =
      (currentUser?.role === "patient" && otherUser.role === "doctor" && String(currentUser.linkedDoctor || "") === String(otherUser._id)) ||
      (currentUser?.role === "doctor" && otherUser.role === "patient" && (otherUser.linkedDoctor && String(otherUser.linkedDoctor) === String(currentUser._id)) && (currentUser.linkedPatients || []).some((id) => String(id) === String(otherUser._id)));

    if (!isPatientDoctorPair) {
      return res.status(403).json({ error: "You can only start a chat with your connected doctor or patient." });
    }

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
