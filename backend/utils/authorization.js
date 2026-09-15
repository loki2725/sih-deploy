import { User } from "../models/User.js";

export const isDoctorLinkedToPatient = async (doctorId, patientId) => {
  const doctor = await User.findById(doctorId).select("linkedPatients");

  return (doctor?.linkedPatients || []).some(
    (id) => id.toString() === patientId.toString(),
  );
};
