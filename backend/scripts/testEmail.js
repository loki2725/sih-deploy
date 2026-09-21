import "dotenv/config";
import { sendOtpEmail, verifyEmailTransport } from "../utils/sendEmail.js";

const recipient = String(process.env.EMAIL_TEST_TO || process.env.EMAIL_FROM || "").trim();

if (!recipient) {
  console.error("Set EMAIL_TEST_TO (or EMAIL_FROM) before running the email test.");
  process.exit(1);
}

try {
  await verifyEmailTransport();
  console.log("Brevo API key verified successfully.");

  await sendOtpEmail(recipient, "123456", "NeuroNest Test");
  console.log(`Test email sent successfully to ${recipient}.`);
} catch (error) {
  console.error("Email test failed:", error.message);
  process.exit(1);
}
