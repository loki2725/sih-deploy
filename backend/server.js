import "dotenv/config";
import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { registerChatSocket } from "./sockets/chatSocket.js";
import { startCareReminderScheduler } from "./services/careReminderService.js";

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
  },
});

registerChatSocket(io);

const startServer = async () => {
  try {
    await connectDB();
    startCareReminderScheduler();

    server.listen(PORT, () => {
      console.log(`Server & WebSockets listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start NeuroNest:", error.message);
    process.exit(1);
  }
};

startServer();
