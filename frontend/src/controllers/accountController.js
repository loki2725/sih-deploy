import { apiClient } from "@/services/apiClient.js";

export const accountController = {
  requestPasswordReset: async (email) => {
    const response = await apiClient("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not request password reset");
    return data;
  },

  resetPassword: async ({ email, otp, newPassword }) => {
    const response = await apiClient("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not reset password");
    return data;
  },

  deleteAccount: async ({ password, confirmation }) => {
    const response = await apiClient("/api/auth/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmation }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not delete account");
    return data;
  },
};
