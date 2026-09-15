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

    const medication = patient.medications.id(req.params.medId);
    if (!medication) return res.status(404).json({ error: "Medication record not found" });

    medication.taken = !medication.taken;
    await patient.save();
    res.status(200).json(patient.medications);
  } catch (error) {
    next(error);
  }
};
