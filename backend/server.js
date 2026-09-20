import "dotenv/config";
import http from "http";
import { Server } from "socket.io";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import { registerChatSocket } from "./sockets/chatSocket.js";
import { startCareJobWorker } from "./services/careJobQueue.js";
import { startSosRetentionScheduler } from "./services/sosRetentionService.js";
import { verifyEmailTransport } from "./utils/sendEmail.js";

const PORT = process.env.PORT || 5001;
const server = http.createServer(app);

const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};

const configuredOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL
      .split(",")
      .map((url) => normalizeOrigin(url.trim()))
      .filter(Boolean)
  : [];

const socketAllowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  ...configuredOrigins,
];

const io = new Server(server, {
  cors: {
    origin: socketAllowedOrigins,
    methods: ["GET", "POST"],
  },
});

registerChatSocket(io);

const startServer = async () => {
  try {
    await connectDB();

    // Verify SMTP in the background. A temporary email-provider outage must
    // not prevent the API from starting, but the deployment logs will clearly
    // show whether OTP email delivery is configured correctly.
    verifyEmailTransport()
      .then(() => console.log("Email transport verified successfully"))
      .catch((error) => console.error("Email transport is not ready:", error.message));

    startCareJobWorker();
    startSosRetentionScheduler();

    server.listen(PORT, () => {
      console.log(`Server & WebSockets listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start NeuroNest:", error.message);
    process.exit(1);
  }
};

startServer();
