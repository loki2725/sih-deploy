import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { requireRole } from "../middleware/auth.js";
import { uploadRecord, getMyRecords, getPatientRecords, downloadRecord } from "../controllers/recordController.js";
import { uploadRecord as multerUpload } from "../config/multer.js";

const router = express.Router();
router.post("/upload", verifyToken, requireRole("patient"), multerUpload.single("file"), uploadRecord);
router.get("/mine", verifyToken, requireRole("patient"), getMyRecords);
router.get("/patient/:patientId", verifyToken, requireRole("doctor"), getPatientRecords);
router.get("/:id/download", verifyToken, downloadRecord);

export default router;
