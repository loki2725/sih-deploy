const configuredApiUrl = String(import.meta.env.VITE_API_URL || "").trim().replace(/\/$/, "");

// Local development keeps the convenient localhost fallback. A production
// build does not: a missing VITE_API_URL must fail with a clear configuration
// error instead of silently trying to call the user's own computer.
export const API_BASE_URL =
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:5001" : "");

export const apiModel = {
  url(path) {
    if (!API_BASE_URL) {
      throw new Error("VITE_API_URL is not configured for this production build.");
    }
    return `${API_BASE_URL}${path}`;
  },
};
