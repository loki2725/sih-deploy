import { User } from "../models/User.js";
import { GameSession } from "../models/GameSession.js";
import { CareAlert } from "../models/CareAlert.js";
import { CareHistory } from "../models/CareHistory.js";
import { getLinkedPatient } from "../utils/authorization.js";
import {
  ensureCurrentCarePlan,
} from "../services/careHistoryService.js";
import {
  CARE_TIME_ZONE,
  getLocalDateKey,
} from "../utils/careSchedule.js";

export const linkPatientByCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const normalizedCode = String(code || "").trim().toUpperCase();
    const connectionCode = normalizedCode.startsWith("MC-") ? normalizedCode.slice(3) : normalizedCode;

    if (!/^[0-9A-F]{8}$/.test(connectionCode)) {
      return res.status(400).json({ error: "Invalid connection code" });
    }

    const patient = await User.findOne({
      role: "patient",
      patientConnectionCode: connectionCode,
    }).select("_id name email patientConnectionCode");

    if (!patient) return res.status(404).json({ error: "Patient not found" });
    if (patient.linkedDoctor && String(patient.linkedDoctor) !== String(req.user.id)) {
      return res.status(409).json({ error: "This patient is already connected to another doctor." });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { linkedPatients: patient._id },
      $pull: { pendingPatients: patient._id },
    });

    await User.findByIdAndUpdate(patient._id, {
      linkedDoctor: req.user.id,
      requestedDoctor: null,
    });

    res.status(200).json({ message: "Patient linked successfully", patient });
  } catch (error) {
    next(error);
  }
};

export const getPatients = async (req, res, next) => {
  try {
    const doctor = await User.findById(req.user.id)
      .populate("linkedPatients", "-password -otp -passwordResetOtp -passwordResetOtpExpiresAt -passwordResetLastSentAt -passwordResetAttempts")
      .populate("pendingPatients", "-password -otp -passwordResetOtp -passwordResetOtpExpiresAt -passwordResetLastSentAt -passwordResetAttempts");

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    for (const patient of doctor.linkedPatients || []) {
      await ensureCurrentCarePlan(patient);
    }

    // Re-read after midnight rollover so the response contains the current plan.
    const refreshedDoctor = await User.findById(req.user.id)
      .populate("linkedPatients", "-password -otp -passwordResetOtp -passwordResetOtpExpiresAt -passwordResetLastSentAt -passwordResetAttempts")
      .populate("pendingPatients", "-password -otp -passwordResetOtp -passwordResetOtpExpiresAt -passwordResetLastSentAt -passwordResetAttempts");

    res.json({
      linkedPatients: refreshedDoctor.linkedPatients || [],
      pendingPatients: refreshedDoctor.pendingPatients || [],
    });
  } catch (error) {
    next(error);
  }
};

export const acceptPatient = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    if (!patientId) return res.status(400).json({ error: "patientId is required" });

    const patient = await User.findOne({ _id: patientId, role: "patient" });
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    if (patient.linkedDoctor && String(patient.linkedDoctor) !== String(req.user.id)) {
      return res.status(409).json({ error: "This patient is already connected to another doctor." });
    }
    if (patient.requestedDoctor && String(patient.requestedDoctor) !== String(req.user.id)) {
      return res.status(403).json({ error: "This patient did not request a connection with your account." });
    }

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { pendingPatients: patientId },
      $addToSet: { linkedPatients: patientId },
    });

    await User.findByIdAndUpdate(patientId, {
      linkedDoctor: req.user.id,
      requestedDoctor: null,
    });

    res.json({ message: "Patient request accepted" });
  } catch (error) {
    next(error);
  }
};

export const getPatientGames = async (req, res, next) => {
  try {
    const patient = await getLinkedPatient(req.user.id, req.params.patientId);
    if (!patient) {
      return res.status(403).json({ error: "Unauthorized to view this patient's data" });
    }

    const games = await GameSession.find({ patientId: patient._id }).sort({ playedAt: -1 });
    res.json(games);
  } catch (error) {
    next(error);
  }
};

export const addMedication = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const name = String(req.body.name || "").trim();
    const dosage = String(req.body.dosage || "").trim();
    const time = String(req.body.time || "").trim();

    if (!name) return res.status(400).json({ error: "Medication name is required" });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return res.status(400).json({ error: "Medication time must use HH:mm format" });
    }

    const patient = await getLinkedPatient(req.user.id, patientId);
    if (!patient) {
      return res.status(403).json({ error: "Not authorized to modify this patient" });
    }

    await ensureCurrentCarePlan(patient);

    patient.medications.push({
      name,
      dosage,
      time,
      prescribedAt: new Date(),
      taken: false,
    });

    await patient.save();

    // The medication remains in the active daily plan. It is copied into
    // Care History by the midnight rollover, not at prescription time.
    res.status(200).json(patient.medications);
  } catch (error) {
    next(error);
  }
};

export const getDiagnoses = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await getLinkedPatient(req.user.id, patientId);
    if (!patient) return res.status(403).json({ error: "Not authorized" });

    res.status(200).json(patient.pastDiagnoses || []);
  } catch (error) {
    next(error);
  }
};

export const addDiagnosis = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: "Note text is required" });
    const patient = await getLinkedPatient(req.user.id, patientId);
    if (!patient) return res.status(403).json({ error: "Not authorized" });

    patient.pastDiagnoses.push({ text: text.trim() });
    await patient.save();
    res.status(201).json(patient.pastDiagnoses);
  } catch (error) {
    next(error);
  }
};

export const updateDiagnosis = async (req, res, next) => {
  try {
    const { patientId, noteId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) return res.status(400).json({ error: "Note text is required" });
    const patient = await getLinkedPatient(req.user.id, patientId);
    if (!patient) return res.status(403).json({ error: "Not authorized" });

    const note = patient.pastDiagnoses.id(noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });

    note.text = text.trim();
    await patient.save();
    res.status(200).json(patient.pastDiagnoses);
  } catch (error) {
    next(error);
  }
};

export const deleteDiagnosis = async (req, res, next) => {
  try {
    const { patientId, noteId } = req.params;
    const patient = await getLinkedPatient(req.user.id, patientId);
    if (!patient) return res.status(403).json({ error: "Not authorized" });

    const note = patient.pastDiagnoses.id(noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });

    patient.pastDiagnoses.pull(noteId);
    await patient.save();
    res.status(200).json(patient.pastDiagnoses);
  } catch (error) {
    next(error);
  }
};


export const addReminder = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const text = String(req.body.text || "").trim();
    const time = String(req.body.time || "").trim();

    if (!text) return res.status(400).json({ error: "Reminder text is required" });
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return res.status(400).json({ error: "Reminder time must use HH:mm format" });
    }

    const patient = await getLinkedPatient(req.user.id, patientId);
    if (!patient) {
      return res.status(403).json({ error: "Not authorized to modify this patient" });
    }

    await ensureCurrentCarePlan(patient);

    patient.doctorReminders.push({
      text,
      time,
      checked: false,
      checkedAt: null,
    });
    await patient.save();

    // The reminder remains in the active daily plan. It is copied into
    // Care History by the midnight rollover, not at creation time.
    res.status(201).json(patient.doctorReminders);
  } catch (error) {
    next(error);
  }
};


export const getCareNotificationSettings = async (req, res, next) => {
  try {
    const doctor = await User.findById(req.user.id).select("careNotificationsEnabled");
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.status(200).json({
      careNotificationsEnabled: doctor.careNotificationsEnabled !== false,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCareNotificationSettings = async (req, res, next) => {
  try {
    const enabled = req.body?.careNotificationsEnabled;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        error: "careNotificationsEnabled must be a boolean",
      });
    }

    const doctor = await User.findByIdAndUpdate(
      req.user.id,
      { careNotificationsEnabled: enabled },
      { new: true, runValidators: true },
    ).select("careNotificationsEnabled");

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    // Turning the feature off also clears currently visible game-missed alerts
    // so the dashboard reflects the doctor's current preference immediately.
    if (!enabled) {
      await CareAlert.updateMany(
        { doctorId: req.user.id, resolved: false },
        { $set: { resolved: true, resolvedAt: new Date() } },
      );
    }

    res.status(200).json({
      careNotificationsEnabled: doctor.careNotificationsEnabled !== false,
    });
  } catch (error) {
    next(error);
  }
};

export const getCareAlerts = async (req, res, next) => {
  try {
    const alerts = await CareAlert.find({
      doctorId: req.user.id,
      resolved: false,
    })
      .populate("patientId", "name email age condition")
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      alerts: alerts.map((alert) => ({
        _id: alert._id,
        type: alert.type,
        message: alert.message,
        createdAt: alert.createdAt,
        patient: alert.patientId,
      })),
    });
  } catch (error) {
    next(error);
  }
};


export const getPatientCareHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const patient = await getLinkedPatient(req.user.id, patientId);

    if (!patient) {
      return res.status(403).json({ error: "Not authorized to view this patient's history" });
    }

    await ensureCurrentCarePlan(patient);

    const requestedDate = String(
      req.query.date || getLocalDateKey(new Date(), CARE_TIME_ZONE),
    ).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
      return res.status(400).json({ error: "Date must use YYYY-MM-DD format" });
    }

    const history = await CareHistory.find({
      doctorId: req.user.id,
      patientId: patient._id,
      dateKey: requestedDate,
      archivedAt: { $ne: null },
    }).sort({ time: 1, prescribedAt: 1 });

    res.status(200).json({
      date: requestedDate,
      patient: {
        _id: patient._id,
        name: patient.name,
      },
      history,
    });
  } catch (error) {
    next(error);
  }
};
