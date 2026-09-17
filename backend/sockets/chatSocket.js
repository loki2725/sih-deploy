import { Message } from "../models/Messages.js";
import { Conversation } from "../models/Conversation.js";

export const registerChatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("User connected to chat:", socket.id);

    socket.on("join_room", async (conversationId) => {
      try {
        const conversation = await Conversation.findById(conversationId).select("_id");
        if (conversation) socket.join(conversationId);
      } catch (error) {
        console.error("Failed to join chat room:", error.message);
      }
    });

    socket.on("send_message", async (data) => {
      const { conversationId, sender, text } = data || {};

      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: sender,
        });

        if (!conversation || !text?.trim()) return;

        const newMessage = await Message.create({
          conversationId,
          sender,
          text: text.trim(),
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newMessage._id,
        });

        io.to(conversationId).emit("receive_message", newMessage);
      } catch (error) {
        console.error("Failed to process message:", error.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
