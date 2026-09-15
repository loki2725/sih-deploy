import { useState, useEffect } from "react";
import {
  Siren,
  CheckCircle2,
  ShieldAlert,
  CalendarClock,
  CalendarPlus,
  Clock3,
  User,
} from "lucide-react";
import { T } from "@/models/constant.js";
import { API_BASE_URL } from "@/models/apiModel.js";
import { Card, Badge, Button } from "@/views/components/common/Primitive.jsx";
import { EmergencyDetailsCard } from "@/views/pages/patient/EmergencyDetailsCard.jsx";

// Formats the live clock card. Kept deliberately large/simple text since
// this whole tab follows the dementia-friendly accessibility approach
// used elsewhere in the app (icon + label together, big touch targets).
function formatLiveDate(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatLiveTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// "Safety Hub" — the patient's one-stop tab for anything safety related:
// the SOS button, today's date/time (helps with disorientation), the
// editable emergency contact card, and a look at upcoming appointments.
export function SafetyHub() {
  // Live clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Profile (only used here for emergencyDetails)
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // SOS
  const [sosStatus, setSosStatus] = useState(null); // null | "sending" | "sent" | "error"
  const [sosDetail, setSosDetail] = useState("");

  // Appointments
  const [appointments, setAppointments] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [requestingId, setRequestingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token") || user.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/appointments/mine`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchDoctors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/patient/doctors`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setDoctors(Array.isArray(data) ? data : data.doctors || []);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    }
  };

  useEffect(() => {
    fetchProfile();
    fetchAppointments();
  }, []);

  const handleSosPress = async () => {
    if (
      !confirm(
        "This will immediately email your doctor and you that you're lost and need help. Continue?",
      )
    )
      return;

    setSosStatus("sending");
    setSosDetail("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/sos/alert`, {
        method: "POST",
        headers: authHeader(),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send SOS alert");
      }

      setSosStatus("sent");
      setSosDetail(
        data.hasLinkedDoctor
          ? "Your doctor and your own email have been notified."
          : "You aren't connected to a doctor yet, so only your own email was notified.",
      );
    } catch (err) {
      setSosStatus("error");
      setSosDetail(err.message);
    } finally {
      setTimeout(() => setSosStatus(null), 6000);
    }
  };

  const hasOpenRequestWith = (doctorId) =>
    appointments.some(
      (a) =>
        a.doctorId?._id === doctorId &&
        !["declined", "cancelled"].includes(a.status),
    );

  const handleRequestAppointment = async (doctorId) => {
    setRequestingId(doctorId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/appointments/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify({ doctorId }),
        },
      );

      if (res.ok) {
        setShowAppointmentModal(false);
        fetchAppointments();
      }
    } catch (err) {
      console.error("Failed to request appointment:", err);
    } finally {
      setRequestingId(null);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!confirm("Cancel this appointment?")) return;
    setCancellingId(appointmentId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/appointments/${appointmentId}/cancel`,
        {
          method: "POST",
          headers: authHeader(),
        },
      );
      if (res.ok) fetchAppointments();
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
    } finally {
      setCancellingId(null);
    }
  };

  // "Upcoming" = anything not declined/cancelled, soonest scheduled first.
  const upcomingAppointments = [...appointments]
    .filter((a) => !["declined", "cancelled"].includes(a.status))
    .sort((a, b) => {
      if (a.status === "scheduled" && b.status === "scheduled") {
        return new Date(a.scheduledDate) - new Date(b.scheduledDate);
      }
      if (a.status === "scheduled") return -1;
      if (b.status === "scheduled") return 1;
      return 0;
    });

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-2 border-b"
        style={{ borderColor: T.line }}
      >
        <div>
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: T.primary }}
          >
            Safety Hub
          </span>
          <h1 className="text-2xl font-bold" style={{ color: T.ink }}>
            Help & Emergency Info
          </h1>
        </div>
        <Badge tone="primary">Patient Portal</Badge>
      </div>

      {/* Live date/time card */}
      <Card className="flex items-center gap-4">
        <div
          className="flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: T.primarySoft }}
        >
          <Clock3 size={24} color={T.primary} />
        </div>
        <div>
          <div className="text-xs font-medium" style={{ color: T.inkSoft }}>
            Today is
          </div>
          <div className="text-lg font-bold" style={{ color: T.ink }}>
            {formatLiveDate(now)}
          </div>
          <div
            className="text-2xl font-bold tracking-wide"
            style={{ color: T.primary }}
          >
            {formatLiveTime(now)}
          </div>
        </div>
      </Card>

      {/* SOS Card - the whole card is clickable, not just the icon. */}
      <div
        onClick={sosStatus === "sending" ? undefined : handleSosPress}
        className={`rounded-2xl p-5 flex items-center gap-4 transition-transform active:scale-[0.99] ${
          sosStatus === "sending"
            ? "cursor-not-allowed opacity-80"
            : "cursor-pointer"
        }`}
        style={{ background: T.red, border: `1px solid ${T.red}` }}
      >
        <div
          className="flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "#fff" }}
        >
          <Siren size={28} color={T.red} />
        </div>
        <div className="flex-1">
          <div className="text-white font-bold text-lg">
            {sosStatus === "sending"
              ? "Sending alert..."
              : sosStatus === "sent"
                ? "Help is on the way"
                : sosStatus === "error"
                  ? "Couldn't send alert"
                  : "I'm Lost — Get Help"}
          </div>
          <div className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
            {sosStatus === "sent" || sosStatus === "error"
              ? sosDetail
              : "Tap anywhere here to instantly email your doctor that you need help."}
          </div>
        </div>
        {sosStatus === "sent" && (
          <CheckCircle2 size={24} color="#fff" className="flex-shrink-0" />
        )}
      </div>

      {/* Emergency Details Card - patient can add/edit this any time. */}
      {!loading && (
        <EmergencyDetailsCard
          details={profileData?.emergencyDetails}
          onSaved={(updated) =>
            setProfileData((prev) => ({ ...prev, emergencyDetails: updated }))
          }
        />
      )}

      {/* Upcoming Appointments Card */}
      <Card>
        <div
          className="font-semibold mb-3 flex items-center justify-between"
          style={{ color: T.ink }}
        >
          <div className="flex items-center gap-2">
            <CalendarClock size={16} /> Upcoming Appointments
          </div>
          <Button
            variant="soft"
            onClick={() => {
              setShowAppointmentModal(true);
              fetchDoctors();
            }}
            className="flex items-center gap-1 py-1.5 px-3 text-xs"
          >
            <CalendarPlus size={14} /> Request Appointment
          </Button>
        </div>

        {loadingAppointments ? (
          <div className="text-sm py-2" style={{ color: T.inkSoft }}>
            Loading appointments...
          </div>
        ) : upcomingAppointments.length === 0 ? (
          <div className="text-sm py-2" style={{ color: T.inkSoft }}>
            No upcoming appointments. Click{" "}
            <strong>Request Appointment</strong> to ask any doctor for one.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingAppointments.map((appt) => (
              <div
                key={appt._id}
                className="p-3 rounded-xl flex items-center justify-between border"
                style={{ borderColor: T.line, background: T.canvas }}
              >
                <div>
                  <div
                    className="text-sm font-semibold"
                    style={{ color: T.ink }}
                  >
                    Dr. {appt.doctorId?.name || "Unknown"}
                  </div>
                  <div className="text-xs" style={{ color: T.inkSoft }}>
                    {appt.status === "scheduled" && appt.scheduledDate
                      ? new Date(appt.scheduledDate).toLocaleString(
                          undefined,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "Waiting for doctor to pick a date"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={appt.status === "scheduled" ? "mint" : "amber"}>
                    {appt.status === "scheduled" ? "Scheduled" : "Pending"}
                  </Badge>
                  <button
                    onClick={() => handleCancelAppointment(appt._id)}
                    disabled={cancellingId === appt._id}
                    className="text-xs font-semibold cursor-pointer hover:underline disabled:opacity-50"
                    style={{ color: T.red }}
                  >
                    {cancellingId === appt._id ? "Cancelling..." : "Cancel"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Request Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div
            className="p-6 rounded-2xl max-w-sm w-full flex flex-col gap-4 shadow-xl"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}
          >
            <h3 className="font-semibold text-base" style={{ color: T.ink }}>
              Request an Appointment
            </h3>
            <p className="text-xs -mt-2" style={{ color: T.inkSoft }}>
              You can request an appointment with any doctor, not just the
              one you're connected to.
            </p>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              {doctors.length === 0 ? (
                <p className="text-xs py-2" style={{ color: T.inkSoft }}>
                  No available doctors found.
                </p>
              ) : (
                doctors.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-3 rounded-xl flex items-center justify-between border"
                    style={{ borderColor: T.line, background: T.canvas }}
                  >
                    <div className="flex items-center gap-2">
                      <User size={16} style={{ color: T.inkSoft }} />
                      <div>
                        <div
                          className="text-xs font-semibold"
                          style={{ color: T.ink }}
                        >
                          Dr. {doc.name}
                        </div>
                        <div
                          className="text-[10px]"
                          style={{ color: T.inkSoft }}
                        >
                          {doc.email}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleRequestAppointment(doc._id)}
                      disabled={
                        requestingId === doc._id ||
                        hasOpenRequestWith(doc._id)
                      }
                    >
                      {requestingId === doc._id
                        ? "Sending..."
                        : hasOpenRequestWith(doc._id)
                          ? "Requested"
                          : "Request"}
                    </Button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowAppointmentModal(false)}
              className="w-full py-2 text-xs font-semibold rounded-xl"
              style={{ background: T.line, color: T.ink }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
