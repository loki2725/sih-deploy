import mongoose from "mongoose";

const sosViewerSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ["patient", "doctor"], required: true },
    viewedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const sosSchema = new mongoose.Schema(
  {
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    location: {
      latitude: { type: Number, required: true, min: -90, max: 90 },
      longitude: { type: Number, required: true, min: -180, max: 180 },
      accuracy: { type: Number, default: null, min: 0 },
    },
    triggeredAt: { type: Date, default: Date.now, index: true },
    status: { type: String, enum: ["active", "resolved"], default: "active", index: true },

    // Only the linked doctor receives this OTP. The plain OTP is never stored.
    doctorOtpHash: { type: String, required: true, select: false },
    doctorOtpExpiresAt: { type: Date, required: true },
    doctorOtpAttempts: { type: Number, default: 0 },
    doctorLocationRevealedAt: { type: Date, default: null },

    // Every successful location access is auditable and is emailed to the patient.
    viewers: { type: [sosViewerSchema], default: [] },
  },
  { timestamps: true },
);

export const SOS = mongoose.model("SOS", sosSchema);
