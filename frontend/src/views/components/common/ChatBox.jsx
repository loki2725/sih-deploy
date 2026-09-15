import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { io } from "socket.io-client";
import { T } from "@/models/constant.js";
import { API_BASE_URL } from "@/models/apiModel.js";
import { Card, Button } from "./Primitive";

export function ChatBox({ recipientId, recipientName }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  const messagesEndRef = useRef(null);

  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const currentUserId = user._id || user.id;
  const token = localStorage.getItem("token") || user.token;

  // 1. Initialize and clean up socket connection
  useEffect(() => {
    const newSocket = io(API_BASE_URL);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // 2. Fetch or create the conversation room on load
  useEffect(() => {
    const initChat = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/chat/conversation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ participantId: recipientId }),
          },
        );

        if (response.ok) {
          const conv = await response.json();
          setConversationId(conv._id);

          if (socket) {
            socket.emit("join_room", conv._id);
          }

          const msgRes = await fetch(
            `${API_BASE_URL}/api/chat/${conv._id}/messages`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );

          if (msgRes.ok) {
            const msgData = await msgRes.json();
            setMessages(msgData);
          }
        }
      } catch (err) {
        console.error("Failed to initialize chat:", err);
      } finally {
        setLoading(false);
      }
    };

    if (recipientId && socket) {
      initChat();
    }
  }, [recipientId, token, socket]);

  // 3. Listen for incoming real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);
    };

    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket]);

  // 4. Auto-scroll to the bottom of the chat box
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 5. Send message handler
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !conversationId || !socket) return;

    const messageData = {
      conversationId,
      sender: currentUserId,
      text: text.trim(),
    };

    socket.emit("send_message", messageData);
    setText("");
  };

  return (
    <Card className="flex flex-col h-[500px] p-4">
      {/* Header */}
      <div className="pb-3 border-b mb-3" style={{ borderColor: T.line }}>
        <h3 className="font-semibold text-sm" style={{ color: T.ink }}>
          Chat with {recipientName || "User"}
        </h3>
        <span
          className="text-xs flex items-center gap-1"
          style={{ color: "#10B981" }}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>{" "}
          Live Secure Connection
        </span>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-3">
        {loading ? (
          <div
            className="text-center text-xs py-10"
            style={{ color: T.inkSoft }}
          >
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div
            className="text-center text-xs py-10"
            style={{ color: T.inkSoft }}
          >
            No messages yet. Send a message to start the conversation!
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender === currentUserId;
            return (
              <div
                key={msg._id || index}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm"
                  style={{
                    background: isMe ? T.primary : T.canvas,
                    color: isMe ? "#fff" : T.ink,
                    borderTopRightRadius: isMe ? "4px" : "16px",
                    borderTopLeftRadius: !isMe ? "4px" : "16px",
                  }}
                >
                  {msg.text}
                </div>
                <span
                  className="text-[10px] mt-1 px-1"
                  style={{ color: T.inkSoft }}
                >
                  {new Date(msg.createdAt || Date.now()).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  )}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="flex gap-2 pt-2 border-t"
        style={{ borderColor: T.line }}
      >
        <input
          type="text"
          placeholder="Type your message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: T.canvas,
            border: `1px solid ${T.line}`,
            color: T.ink,
          }}
        />
        <Button type="submit" className="flex items-center justify-center px-4">
          <Send size={16} />
        </Button>
      </form>
    </Card>
  );
}
