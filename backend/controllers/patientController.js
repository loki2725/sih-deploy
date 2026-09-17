import { ensureCurrentCarePlan, updateMedicationHistoryStatus, updateReminderHistoryStatus } from "../services/careHistoryService.js";
import { User } from "../models/User.js";

export const getDoctors = async (_req, res, next) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select("name email _id");
    res.json(doctors);
  } catch (error) {
    next(error);
  }
};

export const requestDoctor = async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    if (!doctorId) return res.status(400).json({ error: "doctorId is required" });

    const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const patient = await User.findById(req.user.id).select("linkedDoctor requestedDoctor");
    if (patient?.linkedDoctor) {
      return res.status(409).json({ error: "You are already connected to a doctor." });
    }

    await User.findByIdAndUpdate(req.user.id, { requestedDoctor: doctorId });
    await User.findByIdAndUpdate(doctorId, { $addToSet: { pendingPatients: req.user.id } });

    res.json({ message: "Connection request sent successfully" });
  } catch (error) {
    next(error);
  }
};

export const getEmergencyDetails = async (req, res, next) => {
  try {
    const patient = await User.findById(req.user.id).select("emergencyDetails");
    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.status(200).json(patient.emergencyDetails || {});
  } catch (error) {
    next(error);
  }
};

export const updateEmergencyDetails = async (req, res, next) => {
  try {
    const allowedFields = ["contactName", "relationship", "phone", "altPhone", "address", "allergies", "notes"];
    const update = {};

    for (const field of allowedFields) {
      if (field in req.body) {
        update[`emergencyDetails.${field}`] = String(req.body[field] ?? "").trim();
      }
    }

    const patient = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true },
    ).select("emergencyDetails");

    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.status(200).json(patient.emergencyDetails);
  } catch (error) {
    next(error);
  }
};

export const toggleMedicationStatus = async (req, res, next) => {
  try {
    const patient = await User.findById(req.user.id);
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    await ensureCurrentCarePlan(patient);

    const medication = patient.medications.id(req.params.medId);
    if (!medication) return res.status(404).json({ error: "Medication record not found" });

    medication.taken = !medication.taken;
    medication.lastCheckedAt = new Date();
    medication.lastTakenAt = medication.taken ? new Date() : null;
    patient.careItemsLastCheckedAt = new Date();
    await patient.save();
    await updateMedicationHistoryStatus(medication);
    res.status(200).json(patient.medications);
  } catch (error) {
    next(error);
  }
};


export const checkCareItems = async (req, res, next) => {
  try {
    const existingPatient = await User.findOne({ _id: req.user.id, role: "patient" });
    if (!existingPatient) return res.status(404).json({ error: "Patient not found" });
    await ensureCurrentCarePlan(existingPatient);

    const patient = await User.findOneAndUpdate(
      { _id: req.user.id, role: "patient" },
      { $set: { careItemsLastCheckedAt: new Date() } },
      { new: true },
    ).select("careItemsLastCheckedAt");

    if (!patient) return res.status(404).json({ error: "Patient not found" });
    res.status(200).json({ checkedAt: patient.careItemsLastCheckedAt });
  } catch (error) {
    next(error);
  }
};

export const toggleDoctorReminderStatus = async (req, res, next) => {
  try {
    const patient = await User.findOne({ _id: req.user.id, role: "patient" });
    if (!patient) return res.status(404).json({ error: "Patient not found" });

    await ensureCurrentCarePlan(patient);

    const reminder = patient.doctorReminders.id(req.params.reminderId);
    if (!reminder) return res.status(404).json({ error: "Reminder not found" });

    reminder.checked = !reminder.checked;
    reminder.checkedAt = reminder.checked ? new Date() : null;
    patient.careItemsLastCheckedAt = new Date();
    await patient.save();
    await updateReminderHistoryStatus(reminder);

    res.status(200).json(patient.doctorReminders);
  } catch (error) {
    next(error);
  }
};
