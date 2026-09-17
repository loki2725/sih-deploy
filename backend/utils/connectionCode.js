import crypto from "crypto";

export const generatePatientConnectionCode = () =>
  crypto.randomBytes(4).toString("hex").toUpperCase();
