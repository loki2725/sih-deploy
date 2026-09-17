import { User } from "../models/User.js";
import { ensureCurrentCarePlan } from "./careHistoryService.js";
import { GameSession } from "../models/GameSession.js";
import { CareAlert } from "../models/CareAlert.js";
import {
  CARE_TIME_ZONE,
  GAME_WINDOW_END_MINUTES,
  GAME_WINDOW_START_MINUTES,
  getLocalDateKey,
  getLocalMinutes,
  isSameLocalDay,
  parseTimeToMinutes,
} from "../utils/careSchedule.js";
import {
  sendDailyCareReminderEmail,
  sendMedicationReminderEmail,
  sendDoctorReminderEmail,
  sendDoctorMissedGameEmail,
  sendDoctorMissedCareItemEmail,
} from "../utils/sendEmail.js";

const schedulerState = { inProgress: false };
const TEN_MINUTES_MS = 10 * 60 * 1000;

const hasGameToday = async (patientId, now) => {
  const sessions = await GameSession.find({ patientId: patientId.toString() })
    .select("playedAt")
    .sort({ playedAt: -1 })
    .limit(50);

  return sessions.some(
    (session) =>
      session.playedAt &&
      isSameLocalDay(session.playedAt, now, CARE_TIME_ZONE),
  );
};

const hasGameInMorningWindow = async (patientId, now) => {
  const sessions = await GameSession.find({ patientId: patientId.toString() })
    .select("playedAt")
    .sort({ playedAt: -1 })
    .limit(50);

  return sessions.some((session) => {
    if (!session.playedAt || !isSameLocalDay(session.playedAt, now, CARE_TIME_ZONE)) {
      return false;
    }

    const minutes = getLocalMinutes(session.playedAt, CARE_TIME_ZONE);
    return (
      minutes >= GAME_WINDOW_START_MINUTES &&
      minutes < GAME_WINDOW_END_MINUTES
    );
  });
};

const markGameAlertsResolved = async (patientId, dateKey) => {
  await CareAlert.updateMany(
    {
      patientId,
      type: "game_missed",
      dateKey,
      resolved: false,
    },
    {
      $set: { resolved: true, resolvedAt: new Date() },
    },
  );
};

const createGameMissedAlert = async (patient, dateKey, now) => {
  if (!patient.linkedDoctor) return;

  const doctor = await User.findById(patient.linkedDoctor).select(
    "name email careNotificationsEnabled",
  );

  if (!doctor || doctor.careNotificationsEnabled === false) return;

  const existing = await CareAlert.findOne({
    doctorId: doctor._id,
    patientId: patient._id,
    type: "game_missed",
    dateKey,
  }).select("_id");

  await CareAlert.updateOne(
    {
      doctorId: doctor._id,
      patientId: patient._id,
      type: "game_missed",
      dateKey,
    },
    {
      $setOnInsert: {
        doctorId: doctor._id,
        patientId: patient._id,
        type: "game_missed",
        dateKey,
        message: `${patient.name} did not complete a morning memory game by 12:00 PM.`,
        createdAt: now,
      },
    },
    { upsert: true },
  );

  // One doctor email per missed-game event.
  if (!existing?._id && doctor.email) {
    await sendDoctorMissedGameEmail(doctor.email, {
      doctorName: doctor.name,
      patientName: patient.name,
      dateKey,
    });
  }
};

const processPatient = async (patient, now = new Date()) => {
  await ensureCurrentCarePlan(patient, now);

  const dateKey = getLocalDateKey(now, CARE_TIME_ZONE);
  const nowMinutes = getLocalMinutes(now, CARE_TIME_ZONE);
  let changed = false;

  const doctor = patient.linkedDoctor
    ? await User.findById(patient.linkedDoctor).select(
        "name email careNotificationsEnabled",
      )
    : null;
  const doctorNotificationsEnabled =
    doctor?.careNotificationsEnabled !== false;

  // ---------------------------------------------------------------
  // MORNING GAME FOLLOW-UP
  //
  // 06:00–09:00: normal game window.
  // 09:00: first patient email if no game was played in the window.
  // 11:00: second patient email if still no game has been played.
  // 12:00: doctor dashboard alert if still no game has been played.
  //
  // Stage values:
  // null/0 = nothing sent
  // 1      = 09:00 reminder sent
  // 2      = 11:00 reminder sent
  // 3      = doctor alert created
  // 4      = patient eventually completed a game; stop follow-ups
  // ---------------------------------------------------------------
  let gameStage =
    patient.dailyGameReminderStageForDate === dateKey
      ? Number(patient.dailyGameReminderStage || 0)
      : 0;

  const playedToday = await hasGameToday(patient._id, now);

  if (playedToday) {
    if (patient.dailyGameReminderStageForDate !== dateKey || Number(patient.dailyGameReminderStage) !== 4) {
      patient.dailyGameReminderStageForDate = dateKey;
      patient.dailyGameReminderStage = 4;
      changed = true;
    }

    await markGameAlertsResolved(patient._id, dateKey);
  } else {
    if (
      nowMinutes >= GAME_WINDOW_END_MINUTES &&
      gameStage < 1
    ) {
      try {
        await sendDailyCareReminderEmail(patient.email, {
          patientName: patient.name,
          gameWindowStart: "6:00 AM",
          gameWindowEnd: "9:00 AM",
          stage: 1,
        });
        patient.dailyGameReminderStageForDate = dateKey;
        patient.dailyGameReminderStage = 1;
        changed = true;
      } catch (error) {
        console.error(`9 AM game reminder failed for ${patient.email}:`, error.message);
      }
    }

    if (
      nowMinutes >= 11 * 60 &&
      gameStage < 2
    ) {
      try {
        await sendDailyCareReminderEmail(patient.email, {
          patientName: patient.name,
          gameWindowStart: "6:00 AM",
          gameWindowEnd: "9:00 AM",
          stage: 2,
        });
        patient.dailyGameReminderStageForDate = dateKey;
        patient.dailyGameReminderStage = 2;
        changed = true;
      } catch (error) {
        console.error(`11 AM game reminder failed for ${patient.email}:`, error.message);
      }
    }

    // Refresh the stage after the possible 9/11 AM sends.
    gameStage =
      patient.dailyGameReminderStageForDate === dateKey
        ? Number(patient.dailyGameReminderStage || 0)
        : 0;

    if (nowMinutes >= 12 * 60 && gameStage < 3) {
      try {
        await createGameMissedAlert(patient, dateKey, now);
        patient.dailyGameReminderStageForDate = dateKey;
        patient.dailyGameReminderStage = 3;
        changed = true;
      } catch (error) {
        console.error(`Doctor game-missed alert failed for ${patient.email}:`, error.message);
      }
    }
  }

  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // MEDICATIONS
  // After the doctor's scheduled time + 10 minutes, repeat every 10
  // minutes until the patient marks the medication as taken.
  // ---------------------------------------------------------------
  const getDueOccurrence = (scheduledMinutes) => {
    const dueAbsolute = scheduledMinutes + 10;

    if (dueAbsolute < 24 * 60) {
      return {
        dueMinutes: dueAbsolute,
        occurrenceDateKey: dateKey,
        due: nowMinutes >= dueAbsolute,
      };
    }

    // For a late-night schedule (e.g. 23:55), the +10 minute reminder
    // belongs to the following day's first few minutes.
    const dueMinutes = dueAbsolute % (24 * 60);
    const previousDateKey = getLocalDateKey(
      new Date(now.getTime() - 24 * 60 * 60 * 1000),
      CARE_TIME_ZONE,
    );

    return {
      dueMinutes,
      occurrenceDateKey: previousDateKey,
      due: nowMinutes >= dueMinutes,
    };
  };

  for (const medication of patient.medications || []) {
    const scheduledMinutes = parseTimeToMinutes(medication.time);
    if (scheduledMinutes === null) continue;

    const occurrence = getDueOccurrence(scheduledMinutes);
    if (!occurrence.due) continue;

    const takenToday =
      medication.lastTakenAt &&
      isSameLocalDay(medication.lastTakenAt, now, CARE_TIME_ZONE);

    if (takenToday) {
      if (medication.lastReminderSentForDate !== occurrence.occurrenceDateKey) {
        medication.lastReminderSentForDate = occurrence.occurrenceDateKey;
        medication.lastReminderSentAt = null;
        changed = true;
      }
      continue;
    }

    const lastSent = medication.lastReminderSentAt
      ? new Date(medication.lastReminderSentAt).getTime()
      : 0;

    if (
      medication.lastReminderSentForDate === occurrence.occurrenceDateKey &&
      now.getTime() - lastSent < TEN_MINUTES_MS
    ) {
      continue;
    }

    try {
      await sendMedicationReminderEmail(patient.email, {
        patientName: patient.name,
        medicationName: medication.name,
        dosage: medication.dosage,
        scheduledTime: medication.time,
      });

      if (
        doctor &&
        doctorNotificationsEnabled &&
        medication.doctorNotificationSentForDate !== occurrence.occurrenceDateKey
      ) {
        if (doctor.email) {
          await sendDoctorMissedCareItemEmail(doctor.email, {
            doctorName: doctor.name,
            patientName: patient.name,
            itemType: "medication",
            itemName: medication.name,
            scheduledTime: medication.time,
          });
          medication.doctorNotificationSentForDate = occurrence.occurrenceDateKey;
        }
      }

      medication.lastReminderSentForDate = occurrence.occurrenceDateKey;
      medication.lastReminderSentAt = now;
      changed = true;
    } catch (error) {
      console.error(`Medication reminder failed for ${patient.email}:`, error.message);
    }
  }

  // ---------------------------------------------------------------
  // DOCTOR REMINDERS
  // Same 10-minute repeating behaviour as medications.
  // ---------------------------------------------------------------
  for (const reminder of patient.doctorReminders || []) {
    const scheduledMinutes = parseTimeToMinutes(reminder.time);
    if (scheduledMinutes === null) continue;

    const occurrence = getDueOccurrence(scheduledMinutes);
    if (!occurrence.due) continue;

    const checkedToday =
      reminder.checkedAt &&
      isSameLocalDay(reminder.checkedAt, now, CARE_TIME_ZONE);

    if (checkedToday) {
      if (reminder.lastReminderSentForDate !== occurrence.occurrenceDateKey) {
        reminder.lastReminderSentForDate = occurrence.occurrenceDateKey;
        reminder.lastReminderSentAt = null;
        changed = true;
      }
      continue;
    }

    const lastSent = reminder.lastReminderSentAt
      ? new Date(reminder.lastReminderSentAt).getTime()
      : 0;

    if (
      reminder.lastReminderSentForDate === occurrence.occurrenceDateKey &&
      now.getTime() - lastSent < TEN_MINUTES_MS
    ) {
      continue;
    }

    try {
      await sendDoctorReminderEmail(patient.email, {
        patientName: patient.name,
        reminderText: reminder.text,
        scheduledTime: reminder.time,
      });

      if (
        doctor &&
        doctorNotificationsEnabled &&
        reminder.doctorNotificationSentForDate !== occurrence.occurrenceDateKey
      ) {
        if (doctor.email) {
          await sendDoctorMissedCareItemEmail(doctor.email, {
            doctorName: doctor.name,
            patientName: patient.name,
            itemType: "doctor reminder",
            itemName: reminder.text,
            scheduledTime: reminder.time,
          });
          reminder.doctorNotificationSentForDate = occurrence.occurrenceDateKey;
        }
      }

      reminder.lastReminderSentForDate = occurrence.occurrenceDateKey;
      reminder.lastReminderSentAt = now;
      changed = true;
    } catch (error) {
      console.error(`Doctor reminder failed for ${patient.email}:`, error.message);
    }
  }

  if (changed) await patient.save();
};

export const runCareReminderCheck = async (now = new Date()) => {
  if (schedulerState.inProgress) return;
  schedulerState.inProgress = true;

  try {
    const patients = await User.find({
      role: "patient",
      isVerified: true,
    }).select(
      "name email linkedDoctor medications doctorReminders dailyGameReminderStageForDate dailyGameReminderStage carePlanDateKey",
    );

    for (const patient of patients) {
      await processPatient(patient, now);
    }
  } finally {
    schedulerState.inProgress = false;
  }
};

// Kept as a compatibility export. Scheduling is now owned by the persistent
// job worker in careJobQueue.js so restarts do not silently skip the minute loop.
export const startCareReminderScheduler = () => {};
