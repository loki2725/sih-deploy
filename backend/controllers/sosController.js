import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { SOS } from "../models/SOS.js";
import { generateOtp } from "../utils/generateOtp.js";
import {
  sendSosAlertEmail,
  sendSosDoctorOtpEmail,
  sendSosLocationViewedEmail,
  sendSosLocationToDoctorEmail,
} from "../utils/sendEmail.js";

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

const isValidCoordinate = (latitude, longitude) =>
  Number.isFinite(Number(latitude)) &&
  Number.isFinite(Number(longitude)) &&
  Number(latitude) >= -90 &&
  Number(latitude) <= 90 &&
  Number(longitude) >= -180 &&
  Number(longitude) <= 180;

const mapUrl = (latitude, longitude) =>
  `https://www.google.com/maps?q=${encodeURIComponent(latitude)},${encodeURIComponent(longitude)}`;

const formatLocation = (sos) => ({
  latitude: sos.location.latitude,
  longitude: sos.location.longitude,
  accuracy: sos.location.accuracy,
  mapUrl: mapUrl(sos.location.latitude, sos.location.longitude),
});

export const triggerSos = async (req, res, next) => {
  try {
    const { latitude, longitude, accuracy } = req.body || {};

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({ error: "A valid patient location is required for SOS." });
    }

    const patient = await User.findById(req.user.id).populate("linkedDoctor", "name email role");
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const triggeredAt = new Date();
    const doctor = patient.linkedDoctor;

    // The doctor OTP is generated only when a connected doctor exists.
    const doctorOtp = doctor ? generateOtp() : null;
    const doctorOtpHash = await bcrypt.hash(doctorOtp || generateOtp(), 10);

    const sos = await SOS.create({
      patientId: patient._id,
      doctorId: doctor?._id || null,
      location: {
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy: Number.isFinite(Number(accuracy)) ? Number(accuracy) : null,
      },
      triggeredAt,
      doctorOtpHash,
      doctorOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    });

    const recipients = [patient.email, doctor?.email].filter(Boolean);
    const results = await Promise.allSettled([
      sendSosAlertEmail(patient.email, {
        patientName: patient.name,
        triggeredAt,
        location: formatLocation(sos),
        recipientRole: "patient",
      }),
      ...(doctor
        ? [
            sendSosDoctorOtpEmail(doctor.email, {
              patientName: patient.name,
              triggeredAt,
              otp: doctorOtp,
            }),
          ]
        : []),
    ]);

    const sentTo = [];
    const failed = [];
    results.forEach((result, index) => {
      const email = recipients[index];
      if (result.status === "fulfilled") sentTo.push(email);
      else failed.push(email);
    });

    // We require the patient's own SOS email to succeed because it contains the
    // location. If it fails, do not pretend that the SOS was fully delivered.
    if (results[0]?.status === "rejected") {
      await SOS.findByIdAndUpdate(sos._id, { status: "resolved" });
      return res.status(502).json({
        error: "SOS was created, but the patient's location email could not be sent. Please try again.",
        sentTo,
        failed,
      });
    }

    res.status(201).json({
      message: "SOS alert sent with your location.",
      sosId: sos._id,
      sentTo,
      failed,
      hasLinkedDoctor: !!doctor,
      doctorOtpExpiresAt: doctor ? sos.doctorOtpExpiresAt : null,
    });
  } catch (error) {
    next(error);
  }
};

// Doctor dashboard polls this endpoint for active SOS requests belonging to
// patients currently connected to that doctor. OTP hashes are never returned.
export const getDoctorSosAlerts = async (req, res, next) => {
  try {
    const now = new Date();

    // An SOS can only be actioned during the OTP validity window. Older
    // unresolved test/production alerts must not remain on the dashboard.
    await SOS.updateMany(
      {
        doctorId: req.user.id,
        status: "active",
        doctorOtpExpiresAt: { $lte: now },
      },
      { $set: { status: "resolved", doctorOtpExpiresAt: now } },
    );

    const alerts = await SOS.find({
      doctorId: req.user.id,
      status: "active",
      doctorOtpExpiresAt: { $gt: now },
    })
      .populate("patientId", "name email")
      .sort({ triggeredAt: -1 })
      .select("patientId triggeredAt doctorOtpExpiresAt doctorOtpAttempts doctorLocationRevealedAt viewers status");

    res.status(200).json({
      alerts: alerts.map((alert) => ({
        _id: alert._id,
        patient: alert.patientId,
        triggeredAt: alert.triggeredAt,
        otpExpiresAt: alert.doctorOtpExpiresAt,
        otpAttempts: alert.doctorOtpAttempts,
        locationAlreadyRevealed: !!alert.doctorLocationRevealedAt,
        status: alert.status,
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDoctorSosOtp = async (req, res, next) => {
  try {
    const { sosId, otp } = req.body || {};

    if (!sosId || !/^\d{6}$/.test(String(otp || ""))) {
      return res.status(400).json({ error: "Enter the 6-digit OTP sent to your doctor email." });
    }

    const sos = await SOS.findOne({
      _id: sosId,
      doctorId: req.user.id,
      status: "active",
    })
      .select("+doctorOtpHash patientId location triggeredAt doctorOtpExpiresAt doctorOtpAttempts viewers doctorLocationRevealedAt")
      .populate("patientId", "name email");

    if (!sos) return res.status(404).json({ error: "SOS request not found or no longer active." });

    if (sos.doctorLocationRevealedAt) {
      return res.status(409).json({ error: "This SOS location has already been revealed." });
    }

    if (sos.doctorOtpExpiresAt.getTime() < Date.now()) {
      return res.status(410).json({ error: "This SOS OTP has expired." });
    }

    if (sos.doctorOtpAttempts >= MAX_OTP_ATTEMPTS) {
      return res.status(429).json({ error: "Too many incorrect OTP attempts for this SOS." });
    }

    const correct = await bcrypt.compare(String(otp), sos.doctorOtpHash);
    if (!correct) {
      sos.doctorOtpAttempts += 1;
      await sos.save();
      return res.status(401).json({
        error: "Incorrect OTP.",
        attemptsRemaining: Math.max(0, MAX_OTP_ATTEMPTS - sos.doctorOtpAttempts),
      });
    }

    const viewer = await User.findById(req.user.id).select("name email role");
    if (!viewer) return res.status(404).json({ error: "Doctor account not found." });

    const viewedAt = new Date();
    const location = formatLocation(sos);

    // The coordinates are only delivered to the doctor's registered email after
    // the correct OTP has been verified. They are never returned in the API response.
    try {
      await sendSosLocationToDoctorEmail(viewer.email, {
        patientName: sos.patientId.name,
        triggeredAt: sos.triggeredAt,
        viewedAt,
        location,
      });
    } catch (emailError) {
      console.error("SOS doctor location email failed:", emailError.message);
      return res.status(502).json({
        error: "OTP verified, but the location email could not be sent. Please try again.",
      });
    }

    sos.doctorLocationRevealedAt = viewedAt;
    sos.viewers.push({
      userId: viewer._id,
      name: viewer.name,
      email: viewer.email,
      role: viewer.role,
      viewedAt,
    });
    sos.doctorOtpExpiresAt = viewedAt;
    sos.status = "resolved";
    await sos.save();

    // Notify the patient every time their SOS location is successfully accessed.
    try {
      await sendSosLocationViewedEmail(sos.patientId.email, {
        patientName: sos.patientId.name,
        viewerName: viewer.name,
        viewerEmail: viewer.email,
        viewerRole: viewer.role,
        viewedAt,
      });
    } catch (emailError) {
      console.error("SOS location access email failed:", emailError.message);
    }

    res.status(200).json({
      message: "Coordinates have been shared with your registered doctor email.",
      patient: {
        name: sos.patientId.name,
        email: sos.patientId.email,
      },
      viewedAt,
    });
  } catch (error) {
    next(error);
  }
};
