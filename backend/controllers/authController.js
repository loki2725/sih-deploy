import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { generateOtp } from "../utils/generateOtp.js";
import { sendOtpEmail } from "../utils/sendEmail.js";
import { signToken } from "../utils/jwt.js";

const OTP_EXPIRY_MINUTES = 10;

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, age, condition, risk } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);

    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "patient",
      age: age ? Number(age) : null,
      condition: condition || "None listed",
      risk: risk || "mint",
      isVerified: false,
      otp: hashedOtp,
      otpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    const savedUser = await newUser.save();

    try {
      await sendOtpEmail(savedUser.email, otp, savedUser.name);
    } catch (mailError) {
      console.error("Failed to send OTP email:", mailError.message);
      await User.findByIdAndDelete(savedUser._id);

      return res.status(502).json({
        error: "Could not send verification email. Please try registering again.",
      });
    }

    res.status(201).json({
      message: "Registered successfully. Please check your email for the OTP to verify your account.",
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

    const isMatch = await bcrypt.compare(otp, user.otp);
    if (!isMatch) return res.status(400).json({ error: "Invalid OTP" });

    user.isVerified = true;
    user.otp = null;
    user.otpExpiresAt = null;
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

    const otp = generateOtp();
    user.otp = await bcrypt.hash(otp, 10);
    user.otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    await sendOtpEmail(user.email, otp, user.name);
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
      .select("-password -otp")
      .populate("linkedDoctor", "name email");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};
