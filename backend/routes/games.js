import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { logGame, getGameHistory } from "../controllers/gameController.js";

const router = express.Router();
router.post("/log", verifyToken, logGame);
router.get("/history/:patientId", verifyToken, getGameHistory);

export default router;
