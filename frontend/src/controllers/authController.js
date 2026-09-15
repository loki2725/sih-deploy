import { storageModel } from "@/models/storageModel.js";

export const authController = {
  getInitialRole: () => storageModel.getRole(),
  logout: () => storageModel.clearSession(),
};
