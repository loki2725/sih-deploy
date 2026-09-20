import { User } from "../models/User.js";
import { CareHistory } from "../models/CareHistory.js";
import {
  CARE_TIME_ZONE,
  getLocalDateKey,
} from "../utils/careSchedule.js";

const historyStatusFromCompletion = (completedAt, dateKey) =>
  completedAt &&
  getLocalDateKey(completedAt, CARE_TIME_ZONE) === dateKey
    ? "completed"
    : "missed";

export const updateMedicationHistoryStatus = async (medication, now = new Date()) => {
  if (!medication.historyId) return;
  await CareHistory.findByIdAndUpdate(medication.historyId, {
    $set: {
      status: medication.taken ? "completed" : "pending",
      completedAt: medication.taken ? medication.lastTakenAt || now : null,
    },
  });
};

export const updateReminderHistoryStatus = async (reminder, now = new Date()) => {
  if (!reminder.historyId) return;
  await CareHistory.findByIdAndUpdate(reminder.historyId, {
    $set: {
      status: reminder.checked ? "completed" : "pending",
      completedAt: reminder.checked ? reminder.checkedAt || now : null,
    },
  });
};

const archiveMedication = async (doctorId, patientId, medication, dateKey, now) => {
  if (!doctorId) return;

  const status = historyStatusFromCompletion(medication.lastTakenAt, dateKey);
  const query = medication.historyId
    ? { _id: medication.historyId }
    : {
        doctorId,
        patientId,
        sourceItemId: medication._id,
        dateKey,
      };

  const update = {
    $set: {
      doctorId,
      patientId,
      type: "medication",
      sourceItemId: medication._id,
      dateKey,
      name: medication.name,
      dosage: medication.dosage || "",
      time: medication.time,
      prescribedAt: medication.prescribedAt || now,
      status,
      completedAt: status === "completed" ? medication.lastTakenAt : null,
      archivedAt: now,
    },
    $setOnInsert: {
      createdAt: medication.prescribedAt || now,
    },
  };

  const history = await CareHistory.findOneAndUpdate(query, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  });

  return history;
};

const archiveReminder = async (doctorId, patientId, reminder, dateKey, now) => {
  if (!doctorId) return;

  const status = historyStatusFromCompletion(reminder.checkedAt, dateKey);
  const query = reminder.historyId
    ? { _id: reminder.historyId }
    : {
        doctorId,
        patientId,
        sourceItemId: reminder._id,
        dateKey,
      };

  const update = {
    $set: {
      doctorId,
      patientId,
      type: "reminder",
      sourceItemId: reminder._id,
      dateKey,
      name: reminder.text,
      text: reminder.text,
      time: reminder.time,
      prescribedAt: reminder.createdAt || now,
      status,
      completedAt: status === "completed" ? reminder.checkedAt : null,
      archivedAt: now,
    },
    $setOnInsert: {
      createdAt: reminder.createdAt || now,
    },
  };

  const history = await CareHistory.findOneAndUpdate(query, update, {
    upsert: true,
    returnDocument: "after",
    setDefaultsOnInsert: true,
  });

  return history;
};

export const ensureCurrentCarePlan = async (patient, now = new Date()) => {
  if (!patient || patient.role !== "patient") return false;

  const todayKey = getLocalDateKey(now, CARE_TIME_ZONE);

  if (!patient.carePlanDateKey) {
    patient.carePlanDateKey = todayKey;
    await patient.save();
    return false;
  }

  if (patient.carePlanDateKey === todayKey) return false;

  const previousDateKey = patient.carePlanDateKey;
  const doctorId = patient.linkedDoctor?._id || patient.linkedDoctor;

  for (const medication of patient.medications || []) {
    await archiveMedication(doctorId, patient._id, medication, previousDateKey, now);
  }

  for (const reminder of patient.doctorReminders || []) {
    await archiveReminder(doctorId, patient._id, reminder, previousDateKey, now);
  }

  patient.medications = [];
  patient.doctorReminders = [];
  patient.carePlanDateKey = todayKey;
  patient.careItemsLastCheckedAt = null;
  patient.dailyEngagementReminderLastSentForDate = null;
  patient.dailyGameReminderStageForDate = null;
  patient.dailyGameReminderStage = 0;

  await patient.save();
  return true;
};

export const cleanupAllCarePlans = async (now = new Date()) => {
  const patients = await User.find({
    role: "patient",
    isVerified: true,
  });

  for (const patient of patients) {
    await ensureCurrentCarePlan(patient, now);
  }
};
