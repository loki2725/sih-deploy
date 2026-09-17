import mongoose from "mongoose";

const medicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  // The name the patient's file had on their own computer - shown in the UI
  originalName: { type: String, required: true },

  // Where Cloudinary actually stores the file
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },

  mimeType: { type: String, default: "application/octet-stream" },
  fileSize: { type: Number, default: 0 },

  uploadedAt: { type: Date, default: Date.now },
});

export const MedicalRecord = mongoose.model(
  "MedicalRecord",
  medicalRecordSchema,
);
