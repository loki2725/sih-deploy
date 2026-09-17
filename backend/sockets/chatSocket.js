import jwt from "jsonwebtoken";
import { Message } from "../models/Messages.js";
import { Conversation } from "../models/Conversation.js";
import { User } from "../models/User.js";

export const registerChatSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select("_id role tokenVersion");
      if (!user || (user.tokenVersion || 0) !== (payload.tokenVersion || 0)) {
        return next(new Error("Invalid or expired session"));
      }

      socket.user = { id: user._id.toString(), role: user.role };
      return next();
    } catch (_error) {
      return next(new Error("Invalid or expired session"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Authenticated chat connection:", socket.id);

    socket.on("join_room", async (conversationId) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user.id,
        }).select("_id");
        if (conversation) socket.join(conversationId);
      } catch (error) {
        console.error("Failed to join chat room:", error.message);
      }
    });

    socket.on("send_message", async (data, callback) => {
      const { conversationId, text } = data || {};
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.user.id,
        }).select("_id");

        if (!conversation || !text?.trim()) {
          callback?.({ ok: false, error: "Not authorized to send this message." });
          return;
        }

        const newMessage = await Message.create({
          conversationId,
          sender: socket.user.id,
          text: text.trim().slice(0, 2000),
        });

        await Conversation.findByIdAndUpdate(conversationId, { lastMessage: newMessage._id });
        io.to(conversationId).emit("receive_message", newMessage);
        callback?.({ ok: true });
      } catch (error) {
        console.error("Failed to process message:", error.message);
        callback?.({ ok: false, error: "Message could not be sent." });
      }
    });

    socket.on("disconnect", () => {
      console.log("Chat disconnected:", socket.id);
    });
  });
};
