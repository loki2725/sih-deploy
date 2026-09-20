import { io } from "socket.io-client";
import { API_BASE_URL } from "@/models/apiModel.js";

export const createSocket = (options = {}) => {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_URL is not configured for this production build.");
  }
  return io(API_BASE_URL, options);
};
