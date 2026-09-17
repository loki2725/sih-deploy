import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock3 } from "lucide-react";
import { T } from "@/models/constant.js";
import { apiClient } from "@/services/apiClient.js";

const formatDate = (value) =>
  new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export function DoctorCareAlerts() {
  const [alerts, setAlerts] = useState([]);

  const loadAlerts = useCallback(async () => {
    try {
      const response = await apiClient("/api/doctor/care-alerts");
      if (!response.ok) return;
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Failed to load doctor care alerts:", error);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
    const timer = setInterval(loadAlerts, 30 * 1000);
    return () => clearInterval(timer);
  }, [loadAlerts]);

  if (alerts.length === 0) return null;

  return (
    <section
      className="mb-6 rounded-2xl p-4 md:p-5"
      style={{ background: T.redSoft, border: `1px solid ${T.red}` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: T.red, color: T.surface }}
        >
          <AlertTriangle size={22} />
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-bold" style={{ color: T.red }}>
            Morning Game Not Completed
          </h2>
          <p className="text-sm mt-1" style={{ color: T.ink }}>
            These patients had not completed a morning memory game by 12:00 PM.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {alerts.map((alert) => (
          <div
            key={alert._id}
            className="rounded-xl p-4"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}
          >
            <div className="font-bold" style={{ color: T.ink }}>
              {alert.patient?.name || "Patient"}
            </div>

            <div className="text-sm mt-1" style={{ color: T.inkSoft }}>
              {alert.patient?.condition
                ? `${alert.patient.condition} · `
                : ""}
              {alert.message}
            </div>

            <div className="text-xs mt-2 flex items-center gap-1" style={{ color: T.inkSoft }}>
              <Clock3 size={13} />
              Alert created {formatDate(alert.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
