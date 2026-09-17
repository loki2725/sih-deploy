import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock3, ShieldCheck, X } from "lucide-react";
import { T } from "@/models/constant.js";
import { apiClient } from "@/services/apiClient.js";

const SUCCESS_MESSAGE_MS = 10 * 60 * 1000;

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DoctorSosPanel() {
  const [alerts, setAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [sharedMessage, setSharedMessage] = useState(null);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await apiClient("/api/sos/doctor/alerts");
      if (!response.ok) return;
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error("Failed to load SOS alerts:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 10000);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  useEffect(() => {
    if (!sharedMessage) return undefined;

    const timer = setTimeout(() => setSharedMessage(null), SUCCESS_MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [sharedMessage]);

  const openOtp = (alert) => {
    setSelectedAlert(alert);
    setOtp("");
    setError("");
  };

  const closeOtp = () => {
    if (verifying) return;
    setSelectedAlert(null);
    setOtp("");
    setError("");
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (!selectedAlert || otp.length !== 6) return;

    setVerifying(true);
    setError("");

    try {
      const response = await apiClient("/api/sos/doctor/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sosId: selectedAlert._id, otp }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not verify OTP.");

      setAlerts((current) =>
        current.filter((alert) => alert._id !== selectedAlert._id),
      );

      setSharedMessage({
        patientName: data.patient?.name || selectedAlert.patient?.name || "Patient",
        message:
          data.message ||
          "Coordinates have been shared with your registered doctor email.",
      });

      setSelectedAlert(null);
      setOtp("");
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  if (loading && alerts.length === 0) return null;

  return (
    <>
      {alerts.length > 0 && (
        <section
          className="mb-6 rounded-2xl p-4 md:p-5"
          style={{ background: T.redSoft, border: `1px solid ${T.red}` }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.red, color: T.surface }}
            >
              <AlertTriangle size={23} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold" style={{ color: T.red }}>
                SOS — Patient Seeking Help
              </h2>
              <p className="text-sm mt-1" style={{ color: T.ink }}>
                A connected patient has requested help. Enter the 6-digit OTP
                sent to your registered doctor email to securely share the
                captured location with that email.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {alerts.map((alert) => (
              <div
                key={alert._id}
                className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ background: T.surface, border: `1px solid ${T.line}` }}
              >
                <div>
                  <div className="font-bold" style={{ color: T.ink }}>
                    {alert.patient?.name || "Patient"}
                  </div>
                  <div className="text-sm" style={{ color: T.inkSoft }}>
                    <Clock3 size={14} className="inline mr-1" />
                    {formatDate(alert.triggeredAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openOtp(alert)}
                  className="px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-opacity hover:opacity-90"
                  style={{ background: T.red, color: T.surface }}
                >
                  Verify OTP
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {sharedMessage && (
        <section
          className="mb-6 rounded-2xl p-5"
          style={{ background: T.primarySoft, border: `1px solid ${T.primary}` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={20} color={T.primary} />
            <h2 className="font-bold text-lg" style={{ color: T.ink }}>
              SOS Location Shared
            </h2>
          </div>
          <p className="text-sm" style={{ color: T.inkSoft }}>
            {sharedMessage.patientName}'s coordinates have been shared with
            your registered doctor email. The coordinates are intentionally
            not displayed on the NeuroNest website.
          </p>
        </section>
      )}

      {selectedAlert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(38,50,56,0.45)" }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeOtp();
          }}
        >
          <form
            onSubmit={verifyOtp}
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: T.surface }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div
                  className="text-xs font-bold uppercase tracking-wider"
                  style={{ color: T.red }}
                >
                  SOS Location Access
                </div>
                <h2 className="text-xl font-bold mt-1" style={{ color: T.ink }}>
                  {selectedAlert.patient?.name || "Patient"} is seeking help
                </h2>
              </div>
              <button
                type="button"
                onClick={closeOtp}
                className="p-2 rounded-lg cursor-pointer"
                style={{ color: T.inkSoft }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-sm mt-4" style={{ color: T.inkSoft }}>
              Enter the 6-digit OTP sent to your registered doctor email. After
              successful verification, the captured coordinates will be emailed
              to that address and will not be shown on this site.
            </p>

            <input
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              placeholder="000000"
              className="w-full mt-5 rounded-xl border px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none"
              style={{ borderColor: T.line, color: T.ink }}
            />

            {error && (
              <div className="mt-3 text-sm font-semibold" style={{ color: T.red }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={otp.length !== 6 || verifying}
              className="w-full mt-5 rounded-xl px-4 py-3 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: T.red, color: T.surface }}
            >
              {verifying ? "Verifying..." : "Verify OTP & Email Location"}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
