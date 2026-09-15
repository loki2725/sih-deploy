import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Reusable transporter using Gmail SMTP.
// Requires EMAIL_USER (your gmail address) and EMAIL_PASS (a 16-char Gmail
// "App Password" - NOT your normal Gmail password) set in backend/.env
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOtpEmail = async (toEmail, otp, name = "") => {
  const mailOptions = {
    from: `"NeuroNest" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Verify your NeuroNest account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #2d2d2d;">Verify your email</h2>
        <p>Hi ${name || "there"},</p>
        <p>Use the code below to verify your NeuroNest account. This code expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f4f4f4; padding: 16px; border-radius: 6px; margin: 20px 0;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Sent to the patient once a doctor picks a date + time for their
// appointment request.
export const sendAppointmentConfirmationEmail = async (
  toEmail,
  { patientName, doctorName, scheduledDate },
) => {
  const formattedDate = new Date(scheduledDate).toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailOptions = {
    from: `"NeuroNest" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your appointment has been scheduled",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #2d2d2d;">Appointment Confirmed</h2>
        <p>Hi ${patientName || "there"},</p>
        <p>Dr. ${doctorName} has scheduled your appointment for:</p>
        <div style="font-size: 18px; font-weight: bold; text-align: center; background: #f4f4f4; padding: 16px; border-radius: 6px; margin: 20px 0; color: #2d2d2d;">
          ${formattedDate}
        </div>
        <p style="color: #888; font-size: 13px;">Please log in to NeuroNest for more details or to reach out to your physician.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// Sent when a patient presses the SOS button - goes to the patient's own
// email and their linked doctor's email.
export const sendSosAlertEmail = async (
  toEmail,
  { patientName, triggeredAt },
) => {
  const formattedTime = new Date(triggeredAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailOptions = {
    from: `"NeuroNest" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `SOS Alert: ${patientName} needs help`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 2px solid #E0554F; border-radius: 8px;">
        <h2 style="color: #E0554F;">🚨 SOS Alert</h2>
        <p style="font-size: 15px; color: #2d2d2d;">
          <strong>${patientName}</strong> has pressed the SOS button on NeuroNest and indicated they are <strong>lost and need help</strong>.
        </p>
        <div style="font-size: 14px; text-align: center; background: #FBEAE9; padding: 12px; border-radius: 6px; margin: 20px 0; color: #E0554F;">
          Triggered on ${formattedTime}
        </div>
        <p style="color: #888; font-size: 13px;">Please reach out to ${patientName} as soon as possible.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
