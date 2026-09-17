import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  requestAppointment,
  getMyAppointments,
  getDoctorAppointments,
  scheduleAppointment,
  declineAppointment,
  cancelAppointment,
} from "../controllers/appointmentController.js";

const router = express.Router();
router.post("/request", verifyToken, requireRole("patient"), requestAppointment);
router.get("/mine", verifyToken, requireRole("patient"), getMyAppointments);
router.get("/doctor", verifyToken, requireRole("doctor"), getDoctorAppointments);
router.post("/:id/schedule", verifyToken, requireRole("doctor"), scheduleAppointment);
router.post("/:id/decline", verifyToken, requireRole("doctor"), declineAppointment);
router.post("/:id/cancel", verifyToken, requireRole("patient"), cancelAppointment);

export default router;
