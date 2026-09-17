import { careModel } from "@/models/careModel.js";

export const careController = {
  markCareItemsChecked: () => careModel.markCareItemsChecked(),
  toggleMedication: (medicationId) => careModel.toggleMedication(medicationId),
  toggleDoctorReminder: (reminderId) => careModel.toggleDoctorReminder(reminderId),
  addDoctorReminder: (patientId, payload) => careModel.addDoctorReminder(patientId, payload),
  addMedication: (patientId, payload) => careModel.addMedication(patientId, payload),
};
