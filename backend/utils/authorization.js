import { User } from "../models/User.js";

/**
 * Resolve a patient from the current doctor's linked patient list.
 *
 * Exact MongoDB _id matching is preferred. NeuroNest also displays a short
 * MC-XXXXXX connection code, so the first six hexadecimal characters are
 * accepted as a compatibility fallback, but only among patients already
 * linked to this doctor. This preserves the authorization boundary.
 */
export const getLinkedPatient = async (doctorId, patientId) => {
  const rawId = String(patientId || "").trim();
  if (!rawId) return null;

  const doctor = await User.findById(doctorId)
    .select("linkedPatients")
    .populate("linkedPatients", "-password -otp");

  if (!doctor) return null;

  const linkedPatients = doctor.linkedPatients || [];

  const exactPatient = linkedPatients.find(
    (patient) => patient?._id?.toString() === rawId,
  );

  if (exactPatient) return exactPatient;

  const connectionCode = rawId.toUpperCase().startsWith("MC-")
    ? rawId.slice(3)
    : rawId;

  if (!/^[0-9A-F]{6,}$/.test(connectionCode)) return null;

  const prefix = connectionCode.slice(0, 6).toUpperCase();

  return (
    linkedPatients.find(
      (patient) =>
        patient?._id?.toString().slice(0, 6).toUpperCase() === prefix,
    ) || null
  );
};

export const isDoctorLinkedToPatient = async (doctorId, patientId) => {
  const patient = await getLinkedPatient(doctorId, patientId);
  return Boolean(patient);
};
