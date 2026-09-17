const USER_KEY = "user";
const TOKEN_KEY = "token";

export const storageModel = {
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "{}");
    } catch {
      return {};
    }
  },
  getRole() {
    return storageModel.getUser().role || null;
  },
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
