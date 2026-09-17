import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  triggerSos,
  getDoctorSosAlerts,
  verifyDoctorSosOtp,
} from "../controllers/sosController.js";

const router = express.Router();

router.post("/alert", verifyToken, requireRole("patient"), triggerSos);
router.get("/doctor/alerts", verifyToken, requireRole("doctor"), getDoctorSosAlerts);
router.post("/doctor/verify", verifyToken, requireRole("doctor"), verifyDoctorSosOtp);

export default router;
