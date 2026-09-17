import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  getDoctors,
  requestDoctor,
  getEmergencyDetails,
  updateEmergencyDetails,
  toggleMedicationStatus,
  checkCareItems,
  toggleDoctorReminderStatus,
} from "../controllers/patientController.js";

const router = express.Router();
router.use(verifyToken, requireRole("patient"));

router.get("/doctors", getDoctors);
router.post("/request-doctor", requestDoctor);
router.get("/emergency-details", getEmergencyDetails);
router.patch("/emergency-details", updateEmergencyDetails);
router.patch("/medications/:medId/status", toggleMedicationStatus);
router.post("/care-items/check", checkCareItems);
router.patch("/reminders/:reminderId/status", toggleDoctorReminderStatus);

export default router;
