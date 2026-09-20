import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail, sendPasswordResetEmail } from "../utils/sendEmail.js";
import { signToken } from "../utils/jwt.js";
import { isSameLocalDay, CARE_TIME_ZONE } from "../utils/careSchedule.js";
import { ensureCurrentCarePlan } from "../services/careHistoryService.js";
import { generatePatientConnectionCode } from "../utils/connectionCode.js";

const OTP_EXPIRY_MINUTES = 10;
const MIN_PASSWORD_LENGTH = 8;
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, age, condition, risk } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedRole = role === "doctor" ? "doctor" : "patient";

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    let patientConnectionCode = null;
    if (normalizedRole === "patient") {
      for (let i = 0; i < 5; i += 1) {
        const candidate = generatePatientConnectionCode();
        if (!(await User.exists({ patientConnectionCode: candidate }))) {
          patientConnectionCode = candidate;
          break;
        }
      }
      if (!patientConnectionCode) return res.status(503).json({ error: "Could not create a unique connection code. Please try again." });
    }

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: normalizedRole,
      age: age ? Number(age) : null,
      condition: condition || "None listed",
      risk: risk || "mint",
      patientConnectionCode,
      isVerified: false,
      otp: hashedOtp,
      otpAttempts: 0,
      otpLastSentAt: new Date(),
      otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    const savedUser = await newUser.save();

    // OTP delivery is a required part of signup. Keep the request bounded so a
    // broken SMTP configuration cannot make the browser wait forever, while
    // also avoiding the old behaviour where signup reported success even when
    // the email had actually failed.
    try {
      await sendOtpEmail(savedUser.email, otp, savedUser.name);
    } catch (mailError) {
      console.error("Failed to send signup OTP email:", mailError.message);
      await User.findByIdAndUpdate(savedUser._id, {
        $set: { otp: null, otpExpiresAt: null, otpLastSentAt: null, otpAttempts: 0 },
      });
      return res.status(502).json({
        error: "Account was created, but the verification email could not be sent. You can request a new code from the verification screen.",
        needsVerification: true,
        emailDeliveryFailed: true,
        email: savedUser.email,
      });
    }

    res.status(201).json({
      message: "Account created. Your verification code has been sent to your email.",
      email: savedUser.email,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.status(400).json({ error: "Account is already verified" });
    if (!user.otp || !user.otpExpiresAt) {
      return res.status(400).json({ error: "No OTP pending. Please request a new one." });
    }
    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: "Too many incorrect OTP attempts. Please request a new code." });
    }

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
        user.otp = null;
        user.otpExpiresAt = null;
        user.otpAttempts = 0;
        user.otpLastSentAt = null;
        await user.save();
        return res.status(429).json({ error: "Too many incorrect OTP attempts. Please request a new code." });
      }
      await user.save();
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
    user.otpAttempts = 0;
    user.otpLastSentAt = null;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.status(400).json({ error: "Account is already verified" });

    if (user.otpLastSentAt && Date.now() - user.otpLastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({ error: "Please wait before requesting another verification code." });
    }

    const otp = generateOtp();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    try {
      await sendOtpEmail(user.email, otp, user.name);
    } catch (mailError) {
      console.error("Failed to resend OTP email:", mailError.message);
      user.otp = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;
      user.otpLastSentAt = null;
      await user.save();
      return res.status(502).json({
        error: "The verification email could not be sent. Please check the email service configuration and try again.",
        needsVerification: true,
        emailDeliveryFailed: true,
        email: user.email,
      });
    }

    res.status(200).json({ message: "A new OTP has been sent to your email." });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        error: "Please verify your email before logging in.",
        needsVerification: true,
        email: user.email,
      });
    }

    res.status(200).json({
      token: signToken(user),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .select("-password -otp -passwordResetOtp -passwordResetOtpExpiresAt -passwordResetLastSentAt -passwordResetAttempts")
      .populate("linkedDoctor", "name email");

    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.role === "patient") {
      await ensureCurrentCarePlan(user);
      if (!user.patientConnectionCode) {
        let code;
        for (let i = 0; i < 5; i += 1) {
          code = generatePatientConnectionCode();
          const exists = await User.exists({ patientConnectionCode: code });
          if (!exists) break;
        }
        user.patientConnectionCode = code;
        await user.save();
      }
    }

    const payload = user.toObject();
    if (payload.role === "patient") {
      payload.medications = (payload.medications || []).map((medication) => ({
        ...medication,
        taken: Boolean(medication.lastTakenAt && isSameLocalDay(medication.lastTakenAt, new Date(), CARE_TIME_ZONE)),
      }));
      payload.doctorReminders = (payload.doctorReminders || []).map((reminder) => ({
        ...reminder,
        checked: Boolean(reminder.checkedAt && isSameLocalDay(reminder.checkedAt, new Date(), CARE_TIME_ZONE)),
      }));
    }

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};


export const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Do not reveal whether an email exists. This prevents account enumeration.
    if (!user || !user.isVerified) {
      return res.status(200).json({
        message: "If a verified account exists for this email, a password reset code has been sent.",
      });
    }

    if (user.passwordResetLastSentAt && Date.now() - user.passwordResetLastSentAt.getTime() < 60 * 1000) {
      return res.status(200).json({
        message: "If a verified account exists for this email, a password reset code has been sent.",
      });
    }

    const otp = generateOtp();
    user.passwordResetOtp = await bcrypt.hash(otp, 10);
    user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    user.passwordResetLastSentAt = new Date();
    user.passwordResetAttempts = 0;
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, otp, user.name);
    } catch (mailError) {
      console.error("Failed to send password reset email:", mailError.message);
      user.passwordResetOtp = null;
      user.passwordResetOtpExpiresAt = null;
      user.passwordResetLastSentAt = null;
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(502).json({ error: "Could not send password reset email. Please try again." });
    }

    res.status(200).json({
      message: "If a verified account exists for this email, a password reset code has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").toLowerCase().trim();
    const otp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.newPassword || "");

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, OTP and new password are required" });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: "OTP must be 6 digits" });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long` });
    }

    const user = await User.findOne({ email });
    if (!user || !user.isVerified) {
      return res.status(400).json({ error: "Invalid or expired password reset code" });
    }

    if (!user.passwordResetOtp || !user.passwordResetOtpExpiresAt) {
      return res.status(400).json({ error: "No password reset request is pending" });
    }

    if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      user.passwordResetOtp = null;
      user.passwordResetOtpExpiresAt = null;
      user.passwordResetLastSentAt = null;
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(400).json({ error: "Password reset code has expired. Please request a new one." });
    }

    const isMatch = await bcrypt.compare(otp, user.passwordResetOtp);
    if (!isMatch) {
      user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
      if (user.passwordResetAttempts >= 5) {
        user.passwordResetOtp = null;
        user.passwordResetOtpExpiresAt = null;
        user.passwordResetLastSentAt = null;
        user.passwordResetAttempts = 0;
        await user.save();
        return res.status(429).json({ error: "Too many incorrect attempts. Please request a new reset code." });
      }
      await user.save();
      return res.status(400).json({ error: "Invalid or expired password reset code" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetOtp = null;
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetLastSentAt = null;
    user.passwordResetAttempts = 0;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    res.status(200).json({ message: "Password reset successfully. Please log in with your new password." });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const { password, confirmation } = req.body;

    if (!password || confirmation !== "DELETE") {
      return res.status(400).json({
        error: 'Current password and confirmation text "DELETE" are required.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const { Appointment } = await import("../models/Appointment.js");
    const { Conversation } = await import("../models/Conversation.js");
    const { Message } = await import("../models/Messages.js");
    const { GameSession } = await import("../models/GameSession.js");
    const { MedicalRecord } = await import("../models/MedicalRecord.js");
    const cloudinary = (await import("../config/cloudinary.js")).default;

    // Remove conversations and their messages for either role.
    const conversations = await Conversation.find({ participants: user._id }).select("_id");
    const conversationIds = conversations.map((conversation) => conversation._id);
    if (conversationIds.length) {
      await Message.deleteMany({ conversationId: { $in: conversationIds } });
      await Conversation.deleteMany({ _id: { $in: conversationIds } });
    }

    // Appointments belong to both participants, so remove them when either
    // account is permanently deleted.
    await Appointment.deleteMany({
      $or: [{ patientId: user._id }, { doctorId: user._id }],
    });

    if (user.role === "patient") {
      const records = await MedicalRecord.find({ patientId: user._id }).select("cloudinaryPublicId");

      // Remove patient-owned Cloudinary files. Failures are logged but do not
      // leave the user's database account behind.
      for (const record of records) {
        try {
          const resourceType = record.mimeType?.startsWith("image/")
            ? "image"
            : record.mimeType?.startsWith("video/")
              ? "video"
              : "raw";
          await cloudinary.uploader.destroy(record.cloudinaryPublicId, { resource_type: resourceType });
        } catch (cloudError) {
          console.error("Failed to remove Cloudinary record:", cloudError.message);
        }
      }

      await MedicalRecord.deleteMany({ patientId: user._id });
      await GameSession.deleteMany({ patientId: user._id.toString() });
      const { CareHistory } = await import("../models/CareHistory.js");
      await CareHistory.deleteMany({ patientId: user._id });

      await User.updateMany(
        { $or: [{ linkedPatients: user._id }, { pendingPatients: user._id }] },
        { $pull: { linkedPatients: user._id, pendingPatients: user._id } },
      );
      if (user.linkedDoctor) {
        await User.findByIdAndUpdate(user.linkedDoctor, {
          $pull: { linkedPatients: user._id, pendingPatients: user._id },
        });
      }
    } else if (user.role === "doctor") {
      await User.updateMany(
        { $or: [{ linkedDoctor: user._id }, { requestedDoctor: user._id }, { linkedPatients: user._id }, { pendingPatients: user._id }] },
        {
          $pull: { linkedPatients: user._id, pendingPatients: user._id },
          $set: {
            linkedDoctor: null,
            requestedDoctor: null,
          },
        },
      );
    }

    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      message: "Account and associated account data deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
