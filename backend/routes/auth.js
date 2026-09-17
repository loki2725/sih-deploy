import express from "express";
import { register, verifyOtp, resendOtp, login, getMe, forgotPassword, resetPassword, deleteAccount } from "../controllers/authController.js";
import { verifyToken } from "../middleware/auth.js";

const router = express.Router();
router.post("/register", register);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", verifyToken, getMe);
router.delete("/account", verifyToken, deleteAccount);

export default router;
