import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useEffect, useMemo } from "react";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Bell,
  User,
  Clock,
  X,
} from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Badge, Button } from "@/views/components/common/Primitive.jsx";

const DAY_MS = 24 * 60 * 60 * 1000;

// Local YYYY-MM-DD key (avoids UTC-shift bugs from toISOString on dates
// close to midnight in the user's timezone)
const dateKey = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isSameDay = (a, b) => dateKey(a) === dateKey(b);

// Builds a 6-row x 7-col grid of Date objects covering the given month,
// padded with the trailing days of the previous month and leading days of
// the next so every week row is complete.
const buildMonthGrid = (year, month) => {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);

  const days = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getTime() + i * DAY_MS));
  }
  return days;
};

export function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [viewDate, setViewDate] = useState(new Date()); // controls which month is shown
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [schedulingId, setSchedulingId] = useState(null); // appointment being scheduled
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [submittingSchedule, setSubmittingSchedule] = useState(false);

  const [decliningId, setDecliningId] = useState(null);

  const fetchAppointments = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;
      if (!token) return;

      const res = await fetch(
        `${API_BASE_URL}/api/appointments/doctor`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load appointments");
      }

      const data = await res.json();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const pending = useMemo(
    () => appointments.filter((a) => a.status === "pending"),
    [appointments],
  );

  const scheduled = useMemo(
    () => appointments.filter((a) => a.status === "scheduled"),
    [appointments],
  );

  // Scheduled appointments happening within the next 7 days, grouped by
  // date, so the doctor gets pinged proactively (e.g. "2 appointments on
  // Sep 12") without having to click through the calendar.
  const upcomingSoon = useMemo(() => {
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * DAY_MS);

    const upcoming = scheduled.filter((a) => {
      const d = new Date(a.scheduledDate);
      return d >= now && d <= weekOut;
    });

    const groups = {};
    upcoming.forEach((a) => {
      const key = dateKey(new Date(a.scheduledDate));
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([key, appts]) => ({
        date: new Date(appts[0].scheduledDate),
        count: appts.length,
      }));
  }, [scheduled]);

  // Map of "YYYY-MM-DD" -> appointments scheduled that day, for coloring
  // calendar cells and powering the day-click list below.
  const scheduledByDate = useMemo(() => {
    const map = {};
    scheduled.forEach((a) => {
      const key = dateKey(new Date(a.scheduledDate));
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [scheduled]);

  const monthGrid = useMemo(
    () => buildMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate],
  );

  const selectedDayAppointments = scheduledByDate[dateKey(selectedDate)] || [];

  const goToMonth = (delta) => {
    setViewDate(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1),
    );
  };

  const openScheduleModal = (appointmentId) => {
    setSchedulingId(appointmentId);
    setScheduleDate("");
    setScheduleTime("");
  };

  const handleConfirmSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return;
    setSubmittingSchedule(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const isoDateTime = new Date(
        `${scheduleDate}T${scheduleTime}`,
      ).toISOString();

      const res = await fetch(
        `${API_BASE_URL}/api/appointments/${schedulingId}/schedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ date: isoDateTime }),
        },
      );

      if (res.ok) {
        setSchedulingId(null);
        fetchAppointments();
      }
    } catch (err) {
      console.error("Failed to schedule appointment:", err);
    } finally {
      setSubmittingSchedule(false);
    }
  };

  const handleDecline = async (appointmentId) => {
    if (!confirm("Decline this appointment?")) return;
    setDecliningId(appointmentId);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const res = await fetch(
        `${API_BASE_URL}/api/appointments/${appointmentId}/decline`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        fetchAppointments();
      }
    } catch (err) {
      console.error("Failed to decline appointment:", err);
    } finally {
      setDecliningId(null);
    }
  };

  const monthLabel = viewDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: T.inkSoft }}>
        Loading appointments...
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="p-4 rounded-xl text-sm font-medium max-w-lg"
        style={{
          background: T.surface,
          border: `1px solid ${T.red}`,
          color: T.red,
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full pb-10 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: T.ink }}>
          Appointments
        </h1>
        <p className="text-sm" style={{ color: T.inkSoft }}>
          Manage incoming requests and view your scheduled calendar.
        </p>
      </div>

      {/* Upcoming-soon ping banner */}
      {upcomingSoon.length > 0 && (
        <div
          className="p-4 rounded-2xl flex items-start gap-3"
          style={{ background: T.primarySoft, border: `1px solid ${T.primary}` }}
        >
          <Bell size={18} color={T.primaryDark} className="mt-0.5" />
          <div className="text-sm" style={{ color: T.primaryDark }}>
            <span className="font-semibold">Heads up — </span>
            {upcomingSoon.map((g, i) => (
              <span key={dateKey(g.date)}>
                {i > 0 && ", "}
                {g.count} appointment{g.count > 1 ? "s" : ""} on{" "}
                {g.date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ))}{" "}
            coming up.
          </div>
        </div>
      )}

      {/* Pending requests needing a response */}
      {pending.length > 0 && (
        <Card>
          <div
            className="font-semibold mb-3 flex items-center justify-between"
            style={{ color: T.ink }}
          >
            <span>New Appointment Requests</span>
            <Badge tone="amber">{pending.length} pending</Badge>
          </div>

          <div className="flex flex-col gap-3">
            {pending.map((appt) => (
              <div
                key={appt._id}
                className="p-3 rounded-xl flex items-center justify-between border flex-wrap gap-2"
                style={{ borderColor: T.line, background: T.canvas }}
              >
                <div className="flex items-center gap-2">
                  <User size={16} style={{ color: T.inkSoft }} />
                  <div>
                    <div
                      className="text-sm font-semibold"
                      style={{ color: T.ink }}
                    >
                      {appt.patientId?.name || "Unknown patient"}
                    </div>
                    {appt.note && (
                      <div className="text-xs" style={{ color: T.inkSoft }}>
                        "{appt.note}"
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => openScheduleModal(appt._id)}
                    className="py-1.5 px-3 text-xs"
                  >
                    Schedule
                  </Button>
                  <button
                    onClick={() => handleDecline(appt._id)}
                    disabled={decliningId === appt._id}
                    className="text-xs font-semibold cursor-pointer hover:underline disabled:opacity-50"
                    style={{ color: T.red }}
                  >
                    {decliningId === appt._id ? "Declining..." : "Decline"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Calendar */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarClock size={16} color={T.primary} />
            <span className="font-semibold text-sm" style={{ color: T.ink }}>
              {monthLabel}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToMonth(-1)}
              className="p-1.5 rounded-lg cursor-pointer hover:opacity-70"
              style={{ background: T.canvas }}
            >
              <ChevronLeft size={16} style={{ color: T.ink }} />
            </button>
            <button
              onClick={() => goToMonth(1)}
              className="p-1.5 rounded-lg cursor-pointer hover:opacity-70"
              style={{ background: T.canvas }}
            >
              <ChevronRight size={16} style={{ color: T.ink }} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdayLabels.map((d) => (
            <div
              key={d}
              className="text-center text-[11px] font-semibold py-1"
              style={{ color: T.inkSoft }}
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthGrid.map((day) => {
            const key = dateKey(day);
            const inCurrentMonth = day.getMonth() === viewDate.getMonth();
            const dayAppointments = scheduledByDate[key] || [];
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);

            return (
              <button
                key={key}
                onClick={() => setSelectedDate(day)}
                className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all text-xs"
                style={{
                  background: isSelected
                    ? T.primary
                    : dayAppointments.length > 0
                      ? T.primarySoft
                      : "transparent",
                  color: !inCurrentMonth
                    ? T.line
                    : isSelected
                      ? "#fff"
                      : T.ink,
                  border: isToday
                    ? `1.5px solid ${isSelected ? "#fff" : T.primary}`
                    : "1px solid transparent",
                  fontWeight: isToday ? "700" : "500",
                }}
              >
                <span>{day.getDate()}</span>
                {dayAppointments.length > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: isSelected ? "#fff" : T.primary,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Selected day's appointment list */}
      <Card>
        <div className="font-semibold mb-3" style={{ color: T.ink }}>
          {selectedDate.toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </div>

        {selectedDayAppointments.length === 0 ? (
          <div className="text-sm py-4 text-center" style={{ color: T.inkSoft }}>
            No appointments scheduled on this day.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {selectedDayAppointments
              .slice()
              .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
              .map((appt) => (
                <div
                  key={appt._id}
                  className="p-3 rounded-xl flex items-center justify-between border"
                  style={{ borderColor: T.line, background: T.canvas }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs"
                      style={{ background: T.primarySoft, color: T.primaryDark }}
                    >
                      {(appt.patientId?.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: T.ink }}>
                        {appt.patientId?.name || "Unknown patient"}
                      </div>
                      <div
                        className="text-xs flex items-center gap-1"
                        style={{ color: T.inkSoft }}
                      >
                        <Clock size={11} />
                        {new Date(appt.scheduledDate).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDecline(appt._id)}
                    disabled={decliningId === appt._id}
                    className="text-xs font-semibold cursor-pointer hover:underline disabled:opacity-50"
                    style={{ color: T.red }}
                  >
                    {decliningId === appt._id ? "Declining..." : "Decline"}
                  </button>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Schedule date+time picker modal */}
      {schedulingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div
            className="p-6 rounded-2xl max-w-sm w-full flex flex-col gap-4 shadow-xl relative"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}
          >
            <button
              onClick={() => setSchedulingId(null)}
              className="absolute top-4 right-4 cursor-pointer"
            >
              <X size={16} style={{ color: T.inkSoft }} />
            </button>

            <h3 className="font-semibold text-base" style={{ color: T.ink }}>
              Pick a Date & Time
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: T.inkSoft }}>
                Date
              </label>
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="p-2.5 rounded-xl text-sm outline-none border"
                style={{ borderColor: T.line, color: T.ink }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: T.inkSoft }}>
                Time
              </label>
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="p-2.5 rounded-xl text-sm outline-none border"
                style={{ borderColor: T.line, color: T.ink }}
              />
            </div>

            <Button
              onClick={handleConfirmSchedule}
              disabled={!scheduleDate || !scheduleTime || submittingSchedule}
            >
              {submittingSchedule ? "Scheduling..." : "Confirm Appointment"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
