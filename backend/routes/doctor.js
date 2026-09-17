import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  getPatients,
  linkPatientByCode,
  acceptPatient,
  getPatientGames,
  getCareAlerts,
  getCareNotificationSettings,
  updateCareNotificationSettings,
  addMedication,
  addReminder,
  getDiagnoses,
  addDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
  getPatientCareHistory,
} from "../controllers/doctorController.js";

const router = express.Router();
router.use(verifyToken, requireRole("doctor"));

router.get("/patients", getPatients);
router.get("/care-alerts", getCareAlerts);
router.get("/care-notification-settings", getCareNotificationSettings);
router.patch("/care-notification-settings", updateCareNotificationSettings);
router.post("/link", linkPatientByCode);
router.post("/accept-patient", acceptPatient);
router.get("/patients/:patientId/games", getPatientGames);
router.get("/patients/:patientId/care-history", getPatientCareHistory);
router.post(["/patients/:patientId/medications", "/patient/:patientId/medications"], addMedication);
router.post("/patients/:patientId/reminders", addReminder);
router.get("/patients/:patientId/diagnoses", getDiagnoses);
router.post("/patients/:patientId/diagnoses", addDiagnosis);
router.patch("/patients/:patientId/diagnoses/:noteId", updateDiagnosis);
router.delete("/patients/:patientId/diagnoses/:noteId", deleteDiagnosis);

export default router;
