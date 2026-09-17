import mongoose from "mongoose";

const careHistorySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["medication", "reminder"],
      required: true,
    },
    sourceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    dosage: { type: String, default: "" },
    text: { type: String, default: "" },
    time: { type: String, required: true },
    prescribedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "completed", "missed"],
      default: "pending",
    },
    completedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

careHistorySchema.index({
  doctorId: 1,
  patientId: 1,
  dateKey: 1,
  prescribedAt: 1,
});

export const CareHistory = mongoose.model("CareHistory", careHistorySchema);
