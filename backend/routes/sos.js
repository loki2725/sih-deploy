import express from "express";
import { verifyToken, requireRole } from "../middleware/auth.js";
import { triggerSos } from "../controllers/sosController.js";

const router = express.Router();
router.post("/alert", verifyToken, requireRole("patient"), triggerSos);

export default router;
