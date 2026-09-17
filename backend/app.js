import express from "express";
import cors from "cors";

import doctorRoutes from "./routes/doctor.js";
import patientRoutes from "./routes/patient.js";
import gameRoutes from "./routes/games.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import appointmentRoutes from "./routes/appointments.js";
import recordRoutes from "./routes/records.js";
import sosRoutes from "./routes/sos.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://localhost:5174"];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ message: "NeuroNest API is running smoothly!" });
});

app.use("/api/games", gameRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patient", patientRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/sos", sosRoutes);

app.use(errorHandler);

export default app;
