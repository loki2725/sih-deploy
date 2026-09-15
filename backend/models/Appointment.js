import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "scheduled", "declined", "cancelled"],
    default: "pending",
  },

  // Optional message the patient can attach when requesting
  note: { type: String, default: "" },

  // Set once the doctor picks a date + time
  scheduledDate: { type: Date, default: null },

  requestedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date, default: null },
});

export const Appointment = mongoose.model("Appointment", appointmentSchema);
