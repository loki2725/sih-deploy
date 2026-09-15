import express from "express";
import { register, verifyOtp, resendOtp, login, getMe } from "../controllers/authController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.get("/me", verifyToken, getMe);

export default router;
