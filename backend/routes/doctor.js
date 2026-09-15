import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import {
  getPatients,
  linkPatientByCode,
  acceptPatient,
  getPatientGames,
  addMedication,
  getDiagnoses,
  addDiagnosis,
  updateDiagnosis,
  deleteDiagnosis,
} from "../controllers/doctorController.js";

const router = express.Router();
router.use(verifyToken, requireRole("doctor"));

router.get("/patients", getPatients);
router.post("/link", linkPatientByCode);
router.post("/accept-patient", acceptPatient);
router.get("/patients/:patientId/games", getPatientGames);
router.post(["/patients/:patientId/medications", "/patient/:patientId/medications"], addMedication);
router.get("/patients/:patientId/diagnoses", getDiagnoses);
router.post("/patients/:patientId/diagnoses", addDiagnosis);
router.patch("/patients/:patientId/diagnoses/:noteId", updateDiagnosis);
router.delete("/patients/:patientId/diagnoses/:noteId", deleteDiagnosis);

export default router;
