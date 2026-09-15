import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, default: "" },
  time: { type: String, default: "Morning" },
  prescribedAt: { type: Date, default: Date.now },
  taken: { type: Boolean, default: false },
});

const diagnosisNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
  },
  { timestamps: true }, // adds createdAt / updatedAt automatically
);

// Emergency contact info the patient keeps up to date themselves. All
// fields are optional strings so a half-filled-in card never blocks saving.
const emergencyDetailsSchema = new mongoose.Schema(
  {
    contactName: { type: String, default: "" },
    relationship: { type: String, default: "" },
    phone: { type: String, default: "" },
    altPhone: { type: String, default: "" },
    address: { type: String, default: "" },
    allergies: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: false, timestamps: true },
);

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  role: { type: String, enum: ["patient", "doctor"], default: "patient" },

  // Email verification (OTP)
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },
  age: { type: Number, default: null },
  condition: { type: String, default: "None listed" },
  risk: { type: String, enum: ["mint", "amber", "red"], default: "mint" },
  medications: [medicationSchema],

  // Editable by the patient at any time from their Safety Hub tab.
  emergencyDetails: { type: emergencyDetailsSchema, default: () => ({}) },

  // Doctor's editable running notes about a patient's history.
  // Each patient has their own separate list; only relevant when role
  // is "patient", but harmless to leave on the schema either way.
  pastDiagnoses: [diagnosisNoteSchema],

  // Connection fields
  requestedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  linkedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  pendingPatients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  linkedPatients: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.model("User", userSchema);
