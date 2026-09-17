import { Job } from "../models/Job.js";
import { runCareReminderCheck } from "./careReminderService.js";

const POLL_MS = 5000;
const LOCK_MS = 2 * 60 * 1000;
let running = false;
let timer = null;

const enqueueNext = async (now = new Date()) => {
  const minute = new Date(now);
  minute.setSeconds(0, 0);
  await Job.updateOne(
    { type: "care-reminder-check", runAt: minute },
    { $setOnInsert: { type: "care-reminder-check", runAt: minute, status: "queued" } },
    { upsert: true },
  );
};

const claimJob = async (now) => Job.findOneAndUpdate(
  { type: "care-reminder-check", status: "queued", runAt: { $lte: now }, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: now } }] },
  { $set: { status: "running", lockedUntil: new Date(now.getTime() + LOCK_MS) }, $inc: { attempts: 1 } },
  { sort: { runAt: 1 }, new: true },
);

const processOne = async () => {
  const now = new Date();
  await enqueueNext(now);
  const job = await claimJob(now);
  if (!job) return;
  try {
    await runCareReminderCheck(now);
    job.status = "done";
    job.lockedUntil = null;
    job.lastError = "";
    await job.save();
  } catch (error) {
    job.status = job.attempts >= 3 ? "failed" : "queued";
    job.lockedUntil = null;
    job.lastError = String(error.message || error).slice(0, 1000);
    await job.save();
  } finally {
    // Always seed the next minute so a failed check cannot stop the scheduler.
    await enqueueNext(new Date(now.getTime() + 60 * 1000));
  }
};

export const startCareJobWorker = () => {
  if (running) return;
  running = true;
  processOne().catch((error) => console.error("Initial care job failed:", error.message));
  timer = setInterval(() => processOne().catch((error) => console.error("Care job worker failed:", error.message)), POLL_MS);
};

export const stopCareJobWorker = () => {
  if (timer) clearInterval(timer);
  timer = null;
  running = false;
};
