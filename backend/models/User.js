import mongoose from "mongoose";

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, default: "" },
  time: { type: String, default: "Morning" },
  prescribedAt: { type: Date, default: Date.now },
  taken: { type: Boolean, default: false },
  lastCheckedAt: { type: Date, default: null },
  lastTakenAt: { type: Date, default: null },
  historyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CareHistory",
    default: null,
  },
  lastReminderSentForDate: { type: String, default: null },
  lastReminderSentAt: { type: Date, default: null },
  doctorNotificationSentForDate: { type: String, default: null },
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
  tokenVersion: { type: Number, default: 0 },
  role: { type: String, enum: ["patient", "doctor"], default: "patient" },

  // Email verification (OTP)
  isVerified: { type: Boolean, default: false },
  otp: { type: String, default: null },
  otpExpiresAt: { type: Date, default: null },

  // Password reset OTP (kept separate from signup verification OTP)
  passwordResetOtp: { type: String, default: null },
  passwordResetOtpExpiresAt: { type: Date, default: null },
  passwordResetLastSentAt: { type: Date, default: null },
  passwordResetAttempts: { type: Number, default: 0 },
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

  // Time-based reminders created by the linked doctor.
  doctorReminders: [{
    text: { type: String, required: true, trim: true },
    time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    checked: { type: Boolean, default: false },
    checkedAt: { type: Date, default: null },
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CareHistory",
      default: null,
    },
    lastReminderSentForDate: { type: String, default: null },
    lastReminderSentAt: { type: Date, default: null },
    doctorNotificationSentForDate: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  }],

  // A patient viewing the medication/reminder area counts as checking
  // their daily care items. The scheduler uses this for the 9 AM engagement check.
  careItemsLastCheckedAt: { type: Date, default: null },
  dailyEngagementReminderLastSentForDate: { type: String, default: null },
  dailyGameReminderStageForDate: { type: String, default: null },
  dailyGameReminderStage: { type: Number, default: 0 },

  // Active medications/reminders belong to one local calendar day.
  // At the next midnight the previous day's plan is archived and cleared.
  carePlanDateKey: { type: String, default: null },

  // Doctor preference: whether NeuroNest should notify this doctor about missed patient care activities.
  careNotificationsEnabled: { type: Boolean, default: true },

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
