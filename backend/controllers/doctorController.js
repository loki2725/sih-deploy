import { User } from "../models/User.js";
import { GameSession } from "../models/GameSession.js";
import { isDoctorLinkedToPatient } from "../utils/authorization.js";


export const linkPatientByCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    const normalizedCode = String(code || "").trim().toUpperCase();
    const prefix = normalizedCode.startsWith("MC-") ? normalizedCode.slice(3) : "";

    if (!/^[0-9A-F]{6}$/.test(prefix)) {
      return res.status(400).json({ error: "Invalid connection code" });
    }

    const patients = await User.find({ role: "patient" }).select("_id name");
    const patient = patients.find(
      (candidate) => candidate._id.toString().slice(0, 6).toUpperCase() === prefix,
    );

    if (!patient) return res.status(404).json({ error: "Patient not found" });

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
      .populate("linkedPatients", "-password -otp")
      .populate("pendingPatients", "-password -otp");

    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    res.json({
      linkedPatients: doctor.linkedPatients || [],
      pendingPatients: doctor.pendingPatients || [],
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
    const authorized = await isDoctorLinkedToPatient(req.user.id, req.params.patientId);
    if (!authorized) return res.status(403).json({ error: "Unauthorized to view this patient's data" });

    const games = await GameSession.find({ patientId: req.params.patientId }).sort({ playedAt: -1 });
    res.json(games);
  } catch (error) {
    next(error);
  }
};

export const addMedication = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { name, dosage, time } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: "Medication name is required" });

    const authorized = await isDoctorLinkedToPatient(req.user.id, patientId);
    if (!authorized) return res.status(403).json({ error: "Not authorized" });

    const patient = await User.findOne({ _id: patientId, role: "patient" });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    patient.medications.push({
      name: name.trim(),
      dosage: dosage || "",
      time: time || "Morning",
      prescribedAt: new Date(),
      taken: false,
    });

    await patient.save();
    res.status(200).json(patient.medications);
  } catch (error) {
    next(error);
  }
};

export const getDiagnoses = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    if (!(await isDoctorLinkedToPatient(req.user.id, patientId))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const patient = await User.findById(patientId).select("pastDiagnoses");
    if (!patient) return res.status(404).json({ error: "Patient not found" });

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
    if (!(await isDoctorLinkedToPatient(req.user.id, patientId))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

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
    if (!(await isDoctorLinkedToPatient(req.user.id, patientId))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

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
    if (!(await isDoctorLinkedToPatient(req.user.id, patientId))) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const patient = await User.findById(patientId);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    const note = patient.pastDiagnoses.id(noteId);
    if (!note) return res.status(404).json({ error: "Note not found" });

    patient.pastDiagnoses.pull(noteId);
    await patient.save();
    res.status(200).json(patient.pastDiagnoses);
  } catch (error) {
    next(error);
  }
};
