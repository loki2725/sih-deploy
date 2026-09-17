import crypto from "crypto";

// Generates a cryptographically-random 6-digit OTP as a string, e.g. "042917"
export const generateOtp = () => {
  const otp = crypto.randomInt(0, 1000000); // 0 - 999999
  return otp.toString().padStart(6, "0");
};
