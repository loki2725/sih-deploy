const DEFAULT_TIME_ZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

const formatterCache = new Map();

const getFormatter = (timeZone) => {
  if (!formatterCache.has(timeZone)) {
    formatterCache.set(
      timeZone,
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    );
  }
  return formatterCache.get(timeZone);
};

export const getLocalParts = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const parts = Object.fromEntries(
    getFormatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return parts;
};

export const getLocalDateKey = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const p = getLocalParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

export const getLocalMinutes = (date = new Date(), timeZone = DEFAULT_TIME_ZONE) => {
  const p = getLocalParts(date, timeZone);
  return p.hour * 60 + p.minute;
};

export const parseTimeToMinutes = (value) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ""));
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

export const isSameLocalDay = (dateA, dateB, timeZone = DEFAULT_TIME_ZONE) =>
  getLocalDateKey(dateA, timeZone) === getLocalDateKey(dateB, timeZone);

export const CARE_TIME_ZONE = DEFAULT_TIME_ZONE;
export const GAME_WINDOW_START_MINUTES = 6 * 60;
export const GAME_WINDOW_END_MINUTES = 9 * 60;
export const REMINDER_GRACE_MINUTES = 10;
