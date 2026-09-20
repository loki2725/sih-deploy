import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Reusable transporter using Gmail SMTP.
// Requires EMAIL_USER (your gmail address) and EMAIL_PASS (a 16-char Gmail
// "App Password" - NOT your normal Gmail password) set in backend/.env
const EMAIL_USER = String(process.env.EMAIL_USER || "").trim();
const EMAIL_PASS = String(process.env.EMAIL_PASS || "").replace(/\s+/g, "");
const EMAIL_FROM = String(process.env.EMAIL_FROM || EMAIL_USER).trim();
const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 12000);

const smtpOptions = process.env.EMAIL_HOST
  ? {
      host: String(process.env.EMAIL_HOST).trim(),
      port: Number(process.env.EMAIL_PORT || 587),
      secure: String(process.env.EMAIL_SECURE || "false").toLowerCase() === "true",
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 8000),
      greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 8000),
      socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 10000),
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    }
  : {
      service: "gmail",
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT_MS || 8000),
      greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 8000),
      socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 10000),
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    };

const transporter = nodemailer.createTransport(smtpOptions);

const assertEmailConfiguration = () => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    throw new Error("Email service is not configured. Set EMAIL_USER and EMAIL_PASS in the backend environment.");
  }
};

const sendMail = async (mailOptions) => {
  assertEmailConfiguration();
  const timeout = Math.max(3000, EMAIL_TIMEOUT_MS);
  let timer;

  try {
    return await Promise.race([
      transporter.sendMail({ ...mailOptions, from: mailOptions.from || `"NeuroNest" <${EMAIL_FROM}>` }),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Email delivery timed out. Check the SMTP configuration and network access.")),
          timeout,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const verifyEmailTransport = async () => {
  assertEmailConfiguration();
  await transporter.verify();
};


export const sendOtpEmail = async (toEmail, otp, name = "") => {
  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: "Verify your NeuroNest account",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #2d2d2d;">Verify your email</h2>
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Use the code below to verify your NeuroNest account. This code expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f4f4f4; padding: 16px; border-radius: 6px; margin: 20px 0;">
          ${escapeHtml(otp)}
        </div>
        <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
};

// Sent to the patient once a doctor picks a date + time for their
// appointment request.

export const sendPasswordResetEmail = async (toEmail, otp, name = "") => {
  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: "Reset your NeuroNest password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: #2d2d2d;">Password reset request</h2>
        <p>Hi ${escapeHtml(name || "there")},</p>
        <p>Use the code below to reset your NeuroNest password. This code expires in 10 minutes.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; background: #f4f4f4; padding: 16px; border-radius: 6px; margin: 20px 0;">
          ${escapeHtml(otp)}
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
};

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
    from: `"NeuroNest" <${EMAIL_FROM}>`,
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

  await sendMail(mailOptions);
};

// Sent when a patient presses the SOS button.
// Patient email contains the captured coordinates; doctor email contains only
// the one-time OTP required to reveal those coordinates inside NeuroNest.
export const sendSosAlertEmail = async (
  toEmail,
  { patientName, triggeredAt, location },
) => {
  const safeName = escapeHtml(patientName || "Patient");
  const formattedTime = new Date(triggeredAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasLocation = location?.latitude != null && location?.longitude != null;
  const safeLat = hasLocation ? escapeHtml(location.latitude) : "Unavailable";
  const safeLon = hasLocation ? escapeHtml(location.longitude) : "Unavailable";
  const safeAccuracy = location?.accuracy != null ? `${escapeHtml(location.accuracy)} m` : "Not available";
  const safeMapUrl = hasLocation ? escapeHtml(location.mapUrl) : "#";

  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: `SOS Alert: ${patientName} needs help`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 2px solid #A94F4F; border-radius: 12px;">
        <h2 style="color: #A94F4F;">🚨 SOS Alert</h2>
        <p style="font-size: 15px; color: #263238;">
          <strong>${safeName}</strong> has pressed the SOS button on NeuroNest and indicated they need help.
        </p>
        <div style="background: #F7E8E8; padding: 14px; border-radius: 8px; margin: 18px 0; color: #263238;">
          <strong>Triggered:</strong> ${escapeHtml(formattedTime)}
        </div>
        <h3 style="color: #263238;">Patient's captured location</h3>
        <p style="color: #546E7A;">Latitude: <strong>${safeLat}</strong><br />Longitude: <strong>${safeLon}</strong><br />Accuracy: <strong>${safeAccuracy}</strong></p>
        ${hasLocation ? `<p><a href="${safeMapUrl}" style="display:inline-block;background:#3F6F68;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;">Open Location in Google Maps</a></p>` : ""}
        <p style="color: #888; font-size: 13px;">This email was sent to the patient account that triggered the SOS.</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
};

export const sendSosDoctorOtpEmail = async (
  toEmail,
  { patientName, triggeredAt, otp },
) => {
  const safeName = escapeHtml(patientName || "Patient");
  const safeOtp = escapeHtml(otp);
  const formattedTime = new Date(triggeredAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: `SOS OTP: ${patientName} needs help`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 2px solid #A94F4F; border-radius: 12px;">
        <h2 style="color: #A94F4F;">🚨 SOS Help Request</h2>
        <p style="font-size: 15px; color: #263238;">
          <strong>${safeName}</strong> has pressed the SOS button on NeuroNest and indicated they need help.
        </p>
        <div style="background: #F7E8E8; padding: 14px; border-radius: 8px; margin: 18px 0; color: #263238;">
          <strong>Triggered:</strong> ${escapeHtml(formattedTime)}
        </div>
        <p style="color:#546E7A;">Enter this one-time code in the NeuroNest doctor dashboard. After successful verification, the patient's captured coordinates will be sent to your registered doctor email.</p>
        <div style="font-size: 34px; font-weight: bold; letter-spacing: 9px; text-align: center; background: #F4F4F4; padding: 18px 10px; border-radius: 8px; margin: 22px 0; color: #263238;">
          ${safeOtp}
        </div>
        <p style="color:#A94F4F;font-weight:bold;">This OTP expires in 10 minutes and is valid only for the doctor's dashboard.</p>
        <p style="color: #888; font-size: 13px;">The patient's coordinates are intentionally not included in this email.</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
};

export const sendSosLocationToDoctorEmail = async (
  toEmail,
  { patientName, triggeredAt, viewedAt, location },
) => {
  const safePatient = escapeHtml(patientName || "Patient");
  const safeLat = escapeHtml(location?.latitude ?? "Unavailable");
  const safeLon = escapeHtml(location?.longitude ?? "Unavailable");
  const safeAccuracy =
    location?.accuracy != null
      ? `${escapeHtml(location.accuracy)} m`
      : "Not available";
  const safeMapUrl = location?.mapUrl ? escapeHtml(location.mapUrl) : "#";

  const triggered = new Date(triggeredAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const verified = new Date(viewedAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await sendMail({
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: `SOS location: ${patientName} — verified access`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;padding:24px;border:2px solid #3F6F68;border-radius:12px;">
        <h2 style="color:#263238;">SOS Location Shared</h2>
        <p style="color:#546E7A;">
          The SOS location for <strong>${safePatient}</strong> was successfully verified
          using the one-time OTP in the NeuroNest doctor dashboard.
        </p>

        <div style="background:#E7F0EE;padding:16px;border-radius:10px;margin:18px 0;color:#263238;line-height:1.7;">
          <strong>SOS triggered:</strong> ${escapeHtml(triggered)}<br />
          <strong>OTP verified:</strong> ${escapeHtml(verified)}
        </div>

        <h3 style="color:#263238;">Captured coordinates</h3>
        <p style="color:#546E7A;line-height:1.7;">
          Latitude: <strong>${safeLat}</strong><br />
          Longitude: <strong>${safeLon}</strong><br />
          Accuracy: <strong>${safeAccuracy}</strong>
        </p>

        ${location?.mapUrl
          ? `<p><a href="${safeMapUrl}" style="display:inline-block;background:#3F6F68;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold;">Open Location in Google Maps</a></p>`
          : ""}

        <p style="color:#888;font-size:13px;">
          These coordinates are intentionally not displayed on the NeuroNest website after OTP verification.
        </p>
      </div>
    `,
  });
};

export const sendSosLocationViewedEmail = async (
  toEmail,
  { patientName, viewerName, viewerEmail, viewerRole, viewedAt },
) => {
  const safePatient = escapeHtml(patientName || "there");
  const safeViewer = escapeHtml(viewerName || "Unknown user");
  const safeEmail = escapeHtml(viewerEmail || "Unavailable");
  const safeRole = escapeHtml(viewerRole || "Unknown");
  const formattedTime = new Date(viewedAt).toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: "Your NeuroNest SOS location was viewed",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #DCE3E0; border-radius: 12px;">
        <h2 style="color:#263238;">🔐 SOS Location Viewed</h2>
        <p style="color:#546E7A;">Hi ${safePatient}, your SOS location was successfully viewed inside NeuroNest.</p>
        <div style="background:#E7F0EE;padding:16px;border-radius:10px;margin:18px 0;color:#263238;line-height:1.7;">
          <strong>Viewed by:</strong> ${safeViewer}<br />
          <strong>Email:</strong> ${safeEmail}<br />
          <strong>Role:</strong> ${safeRole}<br />
          <strong>Viewed at:</strong> ${escapeHtml(formattedTime)}
        </div>
        <p style="color:#888;font-size:13px;">NeuroNest records successful SOS-location access for your safety.</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
};


const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const sendDoctorMissedGameEmail = async (
  toEmail,
  { doctorName, patientName, dateKey },
) => {
  const safeDoctor = escapeHtml(doctorName || "Doctor");
  const safePatient = escapeHtml(patientName || "Patient");
  const safeDate = escapeHtml(dateKey || "today");

  await sendMail({
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: `NeuroNest care alert: ${patientName} missed the morning game`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #DCE3E0; border-radius: 12px;">
        <h2 style="color:#263238;">Patient care alert</h2>
        <p style="color:#546E7A;">Hi ${safeDoctor}, NeuroNest is notifying you that <strong>${safePatient}</strong> did not complete the morning memory game by 12:00 PM.</p>
        <div style="background:#F7E8E8;padding:16px;border-radius:10px;color:#263238;">
          <strong>Date:</strong> ${safeDate}<br />
          <strong>Patient:</strong> ${safePatient}<br />
          <strong>Status:</strong> Morning game not completed by 12:00 PM
        </div>
        <p style="color:#888;font-size:13px;">You can review the care alert from the NeuroNest doctor dashboard.</p>
      </div>
    `,
  });
};

export const sendDoctorMissedCareItemEmail = async (
  toEmail,
  { doctorName, patientName, itemType, itemName, scheduledTime },
) => {
  const safeDoctor = escapeHtml(doctorName || "Doctor");
  const safePatient = escapeHtml(patientName || "Patient");
  const safeType = escapeHtml(itemType || "care item");
  const safeItem = escapeHtml(itemName || "Care item");
  const safeTime = escapeHtml(scheduledTime || "");

  await sendMail({
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: `NeuroNest care alert: ${patientName} has an overdue ${itemType}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #DCE3E0; border-radius: 12px;">
        <h2 style="color:#263238;">Patient care alert</h2>
        <p style="color:#546E7A;">Hi ${safeDoctor}, <strong>${safePatient}</strong> has not marked the following care item as completed.</p>
        <div style="background:#F8EEDC;padding:16px;border-radius:10px;color:#263238;">
          <strong>Type:</strong> ${safeType}<br />
          <strong>Item:</strong> ${safeItem}<br />
          <strong>Scheduled:</strong> ${safeTime}<br />
          <strong>Status:</strong> Still pending
        </div>
        <p style="color:#888;font-size:13px;">This is a single doctor notification for the overdue item. The patient continues to receive their configured reminders until completion.</p>
      </div>
    `,
  });
};

export const sendDailyCareReminderEmail = async (
  toEmail,
  { patientName, gameWindowStart, gameWindowEnd, stage = 1 },
) => {
  const safeName = escapeHtml(patientName || "there");
  const isSecondReminder = Number(stage) === 2;

  const subject = isSecondReminder
    ? "Second reminder: complete your NeuroNest game"
    : "Reminder: complete your NeuroNest morning game";

  const heading = isSecondReminder
    ? "Your morning game is still pending"
    : "Your NeuroNest morning game is waiting";

  const body = isSecondReminder
    ? "You still have not completed a memory game today. Please open NeuroNest and complete one as soon as you can."
    : "You have not completed a memory game during today's 6:00 AM–9:00 AM game window. Please open NeuroNest and complete your morning exercise.";

  const safeBody = escapeHtml(body);

  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #DCE3E0; border-radius: 12px;">
        <h2 style="color: #263238;">${heading}</h2>
        <p style="color: #546E7A; line-height: 1.5;">Hi ${safeName}, ${safeBody}</p>
        <div style="background: #E7F0EE; padding: 16px; border-radius: 10px; margin: 18px 0; color: #263238;">
          <strong>Morning game window:</strong> ${gameWindowStart} – ${gameWindowEnd}<br />
          <strong>Reminder:</strong> ${isSecondReminder ? "Second reminder at 11:00 AM" : "First reminder at 9:00 AM"}
        </div>
        <p style="color: #546E7A;">Your doctor may be notified if the game is still incomplete after 12:00 PM.</p>
      </div>
    `,
  };

  await sendMail(mailOptions);
};

export const sendMedicationReminderEmail = async (
  toEmail,
  { patientName, medicationName, dosage, scheduledTime },
) => {
  const safeName = escapeHtml(patientName || "there");
  const safeMedication = escapeHtml(medicationName);
  const safeDosage = escapeHtml(dosage || "");
  const safeTime = escapeHtml(scheduledTime);
  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: `Medication reminder: ${medicationName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #DCE3E0; border-radius: 12px;">
        <h2 style="color: #263238;">Medication reminder</h2>
        <p style="color: #546E7A;">Hi ${safeName}, this is a reminder about the medication your doctor scheduled.</p>
        <div style="background: #F8EEDC; padding: 16px; border-radius: 10px; margin: 18px 0; color: #263238;">
          <strong>${safeMedication}</strong>${safeDosage ? ` — ${safeDosage}` : ""}<br />
          Scheduled for <strong>${safeTime}</strong>. This reminder was sent 10 minutes after the scheduled time because it has not been marked as taken today.
        </div>
        <p style="color: #546E7A;">Open NeuroNest and mark the medication as taken after you take it.</p>
      </div>
    `,
  };
  await sendMail(mailOptions);
};

export const sendDoctorReminderEmail = async (
  toEmail,
  { patientName, reminderText, scheduledTime },
) => {
  const safeName = escapeHtml(patientName || "there");
  const safeReminder = escapeHtml(reminderText);
  const safeTime = escapeHtml(scheduledTime);
  const mailOptions = {
    from: `"NeuroNest" <${EMAIL_FROM}>`,
    to: toEmail,
    subject: "Reminder from your NeuroNest doctor",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #DCE3E0; border-radius: 12px;">
        <h2 style="color: #263238;">Doctor reminder</h2>
        <p style="color: #546E7A;">Hi ${safeName}, you have a reminder from your doctor.</p>
        <div style="background: #E7F0EE; padding: 16px; border-radius: 10px; margin: 18px 0; color: #263238;">
          <strong>${safeReminder}</strong><br />
          Scheduled for <strong>${safeTime}</strong>. This reminder was sent 10 minutes after the scheduled time because it has not been checked today.
        </div>
        <p style="color: #546E7A;">Open NeuroNest and mark the reminder as checked when you have completed it.</p>
      </div>
    `,
  };
  await sendMail(mailOptions);
};
