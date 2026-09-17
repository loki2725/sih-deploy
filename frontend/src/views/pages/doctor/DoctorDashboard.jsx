import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useEffect } from "react";
import { Clock, Stethoscope, Pill, Bell, Users } from "lucide-react";
import { T } from "@/models/constant.js";
import { Badge } from "@/views/components/common/Primitive.jsx";
import { DoctorSosPanel } from "@/views/components/sos/DoctorSosPanel.jsx";
import { DoctorCareAlerts } from "@/views/components/care/DoctorCareAlerts.jsx";

export function DoctorDashboard({ onOpenPatient, patientsOnly = false }) {
  const [linkedPatients, setLinkedPatients] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCarePatientId, setSelectedCarePatientId] = useState("");

  // Read logged-in doctor profile
  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  // Helper to format doctor title without duplicating "Doctor" or "Dr."
  const getDoctorDisplayName = (name) => {
    if (!name) return "Physician";
    const trimmed = name.trim();
    if (/^(dr\.?|doctor)\s+/i.test(trimmed)) {
      return trimmed;
    }
    return `Dr. ${trimmed}`;
  };

  const doctorTitle = getDoctorDisplayName(currentUser.name);

  useEffect(() => {
    fetchDoctorPatients();
    const timer = setInterval(fetchDoctorPatients, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDoctorPatients = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const response = await fetch(
        `${API_BASE_URL}/api/doctor/patients`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const patients = data.linkedPatients || [];
        setLinkedPatients(patients);
        setPendingPatients(data.pendingPatients || []);
        setSelectedCarePatientId((current) =>
          current && patients.some((p) => p._id === current)
            ? current
            : patients[0]?._id || "",
        );
      }
    } catch (err) {
      console.error("Failed to load doctor roster:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptPatient = async (patientId) => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const response = await fetch(
        `${API_BASE_URL}/api/doctor/accept-patient`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json`,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ patientId }),
        },
      );

      if (response.ok) {
        await fetchDoctorPatients();
      }
    } catch (err) {
      console.error("Failed to accept patient:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full p-6">
      {!patientsOnly && (
        <>
      {/* Header with Doctor Title and Portal Badge */}
                <div
                  className="flex items-center justify-between pb-4 mb-6 border-b"
                  style={{ borderColor: T.line }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${T.primary}15`, color: T.primary }}
                    >
                      <Stethoscope size={22} />
                    </div>
                    <div>
                      <span
                        className="text-xs font-bold uppercase tracking-wider block"
                        style={{ color: T.primary }}
                      >
                        Primary Care Provider
                      </span>
                      <h1 className="text-2xl font-bold" style={{ color: T.ink }}>
                        {doctorTitle}
                      </h1>
                    </div>
                  </div>
                  <Badge tone="primary">Physician Portal</Badge>
                </div>
          
                  </>
      )}

      {patientsOnly ? (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} color={T.primary} />
            <div>
              <h2 className="text-lg font-bold" style={{ color: T.ink }}>
                My Patients
              </h2>
              <p className="text-xs mt-1" style={{ color: T.inkSoft }}>
                Your connected patients. Select a patient to open their care record.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-sm py-4" style={{ color: T.inkSoft }}>
              Loading patients...
            </div>
          ) : linkedPatients.length === 0 ? (
            <div
              className="p-8 text-center rounded-2xl text-sm"
              style={{
                background: T.surface,
                border: `1px solid ${T.line}`,
                color: T.inkSoft,
              }}
            >
              No connected patients yet.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {linkedPatients.map((patient) => (
                <button
                  key={patient._id}
                  type="button"
                  onClick={() => onOpenPatient(patient)}
                  className="w-full text-left p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-md transition-all"
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.line}`,
                  }}
                >
                  <div>
                    <div className="font-semibold" style={{ color: T.ink }}>
                      {patient.name}
                    </div>
                    <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
                      {patient.age ? `${patient.age} yrs` : "Age not specified"}
                      {patient.condition ? ` · ${patient.condition}` : ""}
                    </div>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: T.primary }}>
                    View patient →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

      ) : (
        <>
      <DoctorSosPanel />
      <DoctorCareAlerts />

      {/* Today's Care Plan */}
      {linkedPatients.length > 0 && (
        <section className="mb-8">
          <div
            className="p-5 rounded-2xl"
            style={{
              background: T.surface,
              border: `1px solid ${T.line}`,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-bold" style={{ color: T.ink }}>
                  Today's Care Plan
                </h2>
                <p className="text-xs mt-1" style={{ color: T.inkSoft }}>
                  Medications and reminders prescribed for each patient today.
                </p>
              </div>

              <select
                value={selectedCarePatientId}
                onChange={(e) => setSelectedCarePatientId(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm font-semibold outline-none cursor-pointer border"
                style={{
                  background: T.canvas,
                  borderColor: T.line,
                  color: T.ink,
                }}
              >
                {linkedPatients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {(() => {
              const selected = linkedPatients.find(
                (p) => p._id === selectedCarePatientId,
              );

              if (!selected) {
                return (
                  <div className="text-sm py-3" style={{ color: T.inkSoft }}>
                    Select a patient to view today's care plan.
                  </div>
                );
              }

              const medications = (selected.medications || []).map((item) => ({
                ...item,
                kind: "Medication",
                label: item.name,
                detail: item.dosage || "Dosage not specified",
                icon: <Pill size={16} color={T.primary} />,
              }));

              const reminders = (selected.doctorReminders || []).map((item) => ({
                ...item,
                kind: "Reminder",
                label: item.text,
                detail: "Doctor reminder",
                icon: <Bell size={16} color={T.primary} />,
              }));

              const careItems = [...medications, ...reminders].sort((a, b) =>
                String(a.time || "").localeCompare(String(b.time || "")),
              );

              return (
                <div>
                  <div className="text-sm font-semibold mb-3" style={{ color: T.ink }}>
                    {selected.name}
                  </div>

                  {careItems.length === 0 ? (
                    <div
                      className="rounded-xl p-4 text-sm"
                      style={{ background: T.canvas, color: T.inkSoft }}
                    >
                      No medications or reminders prescribed today.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {careItems.map((item, index) => (
                        <div
                          key={`${item.kind}-${item._id || index}`}
                          className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                          style={{ background: T.canvas, border: `1px solid ${T.line}` }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: T.primarySoft }}
                            >
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate" style={{ color: T.ink }}>
                                {item.label}
                              </div>
                              <div className="text-xs" style={{ color: T.inkSoft }}>
                                {item.kind} · {item.detail}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-bold flex-shrink-0" style={{ color: T.primary }}>
                            {item.time}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* Section 1: Pending Connection Requests */}
      {pendingPatients.length > 0 && (
        <div className="mb-8">
          <h2
            className="text-lg font-bold mb-3 flex items-center gap-2"
            style={{ color: T.ink }}
          >
            <Clock size={20} className="text-amber-500" /> Pending Access
            Requests ({pendingPatients.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingPatients.map((p) => (
              <div
                key={p._id}
                className="p-4 rounded-2xl flex items-center justify-between shadow-sm"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                }}
              >
                <div>
                  <div className="font-semibold" style={{ color: T.ink }}>
                    {p.name}
                  </div>
                  <div className="text-xs" style={{ color: T.inkSoft }}>
                    {p.email} · Requested Connection
                  </div>
                </div>
                <button
                  onClick={() => handleAcceptPatient(p._id)}
                  className="px-4 py-2 text-xs font-bold rounded-xl cursor-pointer hover:opacity-90 active:scale-95 transition-all"
                  style={{ background: T.primary, color: T.surface }}
                >
                  Accept & Connect
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

        </>
      )}
    </div>
  );
}
