import { apiClient } from "@/services/apiClient.js";

const parseResponse = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || fallbackMessage);
  return data;
};

export const careModel = {
  async markCareItemsChecked() {
    const response = await apiClient("/api/patient/care-items/check", {
      method: "POST",
    });
    return parseResponse(response, "Could not record the daily care check");
  },

  async toggleMedication(medicationId) {
    const response = await apiClient(`/api/patient/medications/${medicationId}/status`, {
      method: "PATCH",
    });
    return parseResponse(response, "Could not update medication status");
  },

  async toggleDoctorReminder(reminderId) {
    const response = await apiClient(`/api/patient/reminders/${reminderId}/status`, {
      method: "PATCH",
    });
    return parseResponse(response, "Could not update reminder status");
  },

  async addDoctorReminder(patientId, payload) {
    const response = await apiClient(`/api/doctor/patients/${patientId}/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse(response, "Could not add doctor reminder");
  },

  async addMedication(patientId, payload) {
    const response = await apiClient(`/api/doctor/patients/${patientId}/medications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return parseResponse(response, "Could not add medication");
  },
};
