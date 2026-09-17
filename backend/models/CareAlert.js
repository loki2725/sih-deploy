import mongoose from "mongoose";

const careAlertSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["game_missed"], required: true },
    dateKey: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

careAlertSchema.index(
  { doctorId: 1, patientId: 1, type: 1, dateKey: 1 },
  { unique: true },
);

careAlertSchema.index({ doctorId: 1, resolved: 1, createdAt: -1 });

export const CareAlert = mongoose.model("CareAlert", careAlertSchema);
