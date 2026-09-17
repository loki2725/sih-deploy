import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  type: { type: String, required: true, index: true },
  runAt: { type: Date, required: true, index: true },
  lockedUntil: { type: Date, default: null, index: true },
  attempts: { type: Number, default: 0 },
  status: { type: String, enum: ["queued", "running", "done", "failed"], default: "queued", index: true },
  lastError: { type: String, default: "" },
}, { timestamps: true });

jobSchema.index({ type: 1, runAt: 1 }, { unique: true });
export const Job = mongoose.model("Job", jobSchema);
