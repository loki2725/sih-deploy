const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const API_BASE_URL = configuredApiUrl.replace(/\/$/, "");

export const apiModel = {
  url(path) {
    return `${API_BASE_URL}${path}`;
  },
};
