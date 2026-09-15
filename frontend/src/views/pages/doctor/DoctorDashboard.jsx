import { useState, useEffect } from "react";
import { UserCheck, Clock, ChevronRight, Stethoscope } from "lucide-react";
import { T } from "@/models/constant.js";
import { API_BASE_URL } from "@/models/apiModel.js";
import { Badge } from "@/views/components/common/Primitive.jsx";

export function DoctorDashboard({ onOpenPatient }) {
  const [linkedPatients, setLinkedPatients] = useState([]);
  const [pendingPatients, setPendingPatients] = useState([]);
  const [loading, setLoading] = useState(true);

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
        setLinkedPatients(data.linkedPatients || []);
        setPendingPatients(data.pendingPatients || []);
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
            "Content-Type": "application/json",
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

      {/* Section 2: Authorized Patients Roster */}
      <div>
        <h2
          className="text-lg font-bold mb-3 flex items-center gap-2"
          style={{ color: T.ink }}
        >
          <UserCheck size={20} color={T.primary} /> My Patients (
          {linkedPatients.length})
        </h2>

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
            No active patient connections. When patients send a connection
            request from their profile and you click Accept, they will appear
            here.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {linkedPatients.map((patient) => (
              <div
                key={patient._id}
                onClick={() => onOpenPatient(patient)}
                className="p-4 rounded-2xl flex items-center justify-between cursor-pointer hover:shadow-md hover:border-primary/40 transition-all"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.line}`,
                }}
              >
                <div>
                  <div className="font-semibold" style={{ color: T.ink }}>
                    {patient.name}
                  </div>
                  <div className="text-xs" style={{ color: T.inkSoft }}>
                    {patient.age ? `${patient.age} yrs · ` : ""}
                    {patient.condition || "No condition listed"}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: T.inkSoft }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
