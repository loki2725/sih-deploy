import "dotenv/config";
import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { registerChatSocket } from "./sockets/chatSocket.js";

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

const defaultOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];
const configuredOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim().replace(/\/$/, ""))
  : [];
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

registerChatSocket(io);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server & WebSockets listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start NeuroNest:", error.message);
    process.exit(1);
  }
};

startServer();
