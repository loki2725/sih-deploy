import { io } from "socket.io-client";
import { API_BASE_URL } from "@/models/apiModel.js";

export const createSocket = (options = {}) => io(API_BASE_URL, options);
