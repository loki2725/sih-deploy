import { SOS } from "../models/SOS.js";

const RETENTION_CHECK_MS = 60 * 60 * 1000;
let running = false;

export const redactExpiredSosLocations = async (now = new Date()) => {
  const retentionCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const expired = await SOS.find({
    locationRedactedAt: null,
    "location.latitude": { $ne: null },
    $or: [
      { locationExpiresAt: { $lte: now, $ne: null } },
      { locationExpiresAt: null, status: "resolved", triggeredAt: { $lte: retentionCutoff } },
    ],
  }).select("_id");

  if (!expired.length) return 0;
  const ids = expired.map((item) => item._id);
  await SOS.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        "location.latitude": null,
        "location.longitude": null,
        "location.accuracy": null,
        locationRedactedAt: now,
      },
    },
  );
  return ids.length;
};

export const startSosRetentionScheduler = () => {
  if (running) return;
  running = true;
  redactExpiredSosLocations().catch((error) => console.error("Initial SOS retention check failed:", error.message));
  setInterval(() => {
    redactExpiredSosLocations().catch((error) => console.error("SOS retention check failed:", error.message));
  }, RETENTION_CHECK_MS);
};
