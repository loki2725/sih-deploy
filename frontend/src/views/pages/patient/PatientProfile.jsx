import { useState, useEffect } from "react";
import {
  Link2,
  QrCode,
  Pill,
  Plus,
  User,
  ShieldCheck,
  MessageCircle,
  X,
  Bell,
} from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Badge, Button } from "@/views/components/common/Primitive.jsx";
import { ChatBox } from "@/views/components/common/ChatBox.jsx"; // Ensure this path matches your file structure
import { careController } from "@/controllers/careController.js";

export function PatientProfile() {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Doctor modal states
  const [doctors, setDoctors] = useState([]);
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [connectingId, setConnectingId] = useState(null);

  // Chat state
  const [showChat, setShowChat] = useState(false);

  const fetchProfile = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;
      if (!token) return;

      const response = await fetch("http://localhost:5001/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        await careController.markCareItemsChecked();
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    // Refresh around midnight so the previous day's completed care plan
    // disappears from the patient view when the new day starts.
    const timer = setInterval(fetchProfile, 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDoctors = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const res = await fetch("http://localhost:5001/api/patient/doctors", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const doctorList = Array.isArray(data) ? data : data.doctors || [];
        setDoctors(doctorList);
      }
    } catch (err) {
      console.error("Failed to fetch doctors:", err);
    }
  };

  const handleConnect = async (doctorId) => {
    setConnectingId(doctorId);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const res = await fetch(
        "http://localhost:5001/api/patient/request-doctor",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ doctorId }),
        },
      );

      if (res.ok) {
        alert("Connection request sent to doctor!");
        setShowDoctorModal(false);
        fetchProfile();
      }
    } catch (err) {
      console.error("Failed to send request:", err);
    } finally {
      setConnectingId(null);
    }
  };

  const handleToggleReminder = async (reminderId) => {
    if (!reminderId) return;
    try {
      const updatedReminders = await careController.toggleDoctorReminder(reminderId);
      setProfileData((prev) => ({
        ...prev,
        doctorReminders: updatedReminders,
      }));
    } catch (err) {
      console.error("Failed to update doctor reminder:", err);
    }
  };

  const handleToggleMedication = async (medId) => {
    if (!medId) return;
    try {
      const updatedMeds = await careController.toggleMedication(medId);
      setProfileData((prev) => ({
        ...prev,
        medications: updatedMeds,
      }));
    } catch (err) {
      console.error("Failed to update medication status:", err);
    }
  };

  if (loading || !profileData) {
    return (
      <div className="p-6 text-sm" style={{ color: T.inkSoft }}>
        Loading profile...
      </div>
    );
  }

  const medications = profileData.medications || [];
  const displayCode = `MC-${profileData._id?.substring(0, 6).toUpperCase()}`;
  const linkedDoctor = profileData.linkedDoctor;

  return (
    <div className="max-w-2xl flex flex-col gap-4">
      {/* Name and Title Header */}
      <div
        className="flex items-center justify-between pb-2 border-b"
        style={{ borderColor: T.line }}
      >
        <div>
          <span
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: T.primary }}
          >
            Patient Profile
          </span>
          <h1 className="text-2xl font-bold" style={{ color: T.ink }}>
            {profileData.name}
          </h1>
        </div>
        <Badge tone="primary">Patient Portal</Badge>
      </div>

      {/* Doctor Connection Card */}
      <Card>
        <div
          className="font-semibold mb-3 flex items-center justify-between"
          style={{ color: T.ink }}
        >
          <div className="flex items-center gap-2">
            <Link2 size={16} /> Doctor Connection
          </div>
          {!linkedDoctor && (
            <Button
              onClick={() => {
                setShowDoctorModal(true);
                fetchDoctors();
              }}
            >
              <Plus size={14} className="mr-1 inline" /> Connect Doctor
            </Button>
          )}
        </div>

        {linkedDoctor ? (
          <div
            className="p-4 rounded-xl flex items-center justify-between mb-4 border"
            style={{ background: T.canvas, borderColor: T.line }}
          >
            <div className="flex items-center gap-3">
              <ShieldCheck size={24} color={T.primary} />
              <div>
                <div
                  className="text-xs font-medium"
                  style={{ color: T.inkSoft }}
                >
                  Primary Physician
                </div>
                <div className="text-sm font-bold" style={{ color: T.ink }}>
                  Dr. {linkedDoctor.name}
                </div>
                <div className="text-xs" style={{ color: T.inkSoft }}>
                  {linkedDoctor.email}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge tone="mint">Connected</Badge>
              <Button
                onClick={() => setShowChat(true)}
                className="flex items-center gap-1 py-1.5 px-3 text-xs"
              >
                <MessageCircle size={14} /> Message Doctor
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm mb-4" style={{ color: T.inkSoft }}>
            Share your code below with your physician or click{" "}
            <strong>Connect Doctor</strong> to select from available physicians.
          </p>
        )}

        <div
          className="p-3 rounded-lg flex items-center gap-3"
          style={{ background: T.canvas }}
        >
          <QrCode size={20} color={T.primary} />
          <div>
            <div className="text-xs" style={{ color: T.inkSoft }}>
              Your connection code
            </div>
            <div
              className="text-sm font-mono font-semibold"
              style={{ color: T.ink }}
            >
              {displayCode}
            </div>
          </div>
        </div>
      </Card>

      {/* Medications Card */}
      <Card>
        <div
          className="font-semibold mb-3 flex items-center gap-2"
          style={{ color: T.ink }}
        >
          <Pill size={16} /> Medications & Reminders
        </div>

        {medications.length === 0 ? (
          <div className="text-sm py-2" style={{ color: T.inkSoft }}>
            No medications prescribed yet.
          </div>
        ) : (
          medications.map((m, i) => (
            <div
              key={m._id || i}
              className="flex items-center justify-between py-2"
              style={{ borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}
            >
              <div className="text-sm" style={{ color: T.ink }}>
                {m.name}{" "}
                {m.dosage && (
                  <span className="text-xs opacity-70">({m.dosage})</span>
                )}{" "}
                <span style={{ color: T.inkSoft }}>· {m.time}</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleMedication(m._id)}
                className="cursor-pointer transition-transform active:scale-95"
                title="Click to toggle status"
              >
                <Badge tone={m.taken ? "mint" : "amber"}>
                  {m.taken ? "Taken ✓" : "Pending"}
                </Badge>
              </button>
            </div>
          ))
        )}
      </Card>

      {/* Doctor Reminders Card */}
      <Card>
        <div
          className="font-semibold mb-3 flex items-center gap-2"
          style={{ color: T.ink }}
        >
          <Bell size={16} /> Doctor Reminders
        </div>

        {(profileData.doctorReminders || []).length === 0 ? (
          <div className="text-sm py-2" style={{ color: T.inkSoft }}>
            No reminders from your doctor yet.
          </div>
        ) : (
          profileData.doctorReminders.map((reminder, i) => (
            <div
              key={reminder._id || i}
              className="flex items-start justify-between gap-3 py-2.5"
              style={{ borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium break-words" style={{ color: T.ink }}>
                  {reminder.text}
                </div>
                <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
                  Scheduled for {reminder.time}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggleReminder(reminder._id)}
                className="cursor-pointer flex-shrink-0"
                title="Mark reminder as checked"
              >
                <Badge tone={reminder.checked ? "mint" : "amber"}>
                  {reminder.checked ? "Checked ✓" : "Pending"}
                </Badge>
              </button>
            </div>
          ))
        )}
      </Card>

      {/* Health Profile Card */}
      <Card>
        <div className="font-semibold mb-3" style={{ color: T.ink }}>
          Health Profile
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span style={{ color: T.inkSoft }}>Age</span>
            <div style={{ color: T.ink }}>
              {profileData.age ? `${profileData.age} years` : "Not specified"}
            </div>
          </div>
          <div>
            <span style={{ color: T.inkSoft }}>Condition</span>
            <div style={{ color: T.ink }}>
              {profileData.condition || "None listed"}
            </div>
          </div>
          <div>
            <span style={{ color: T.inkSoft }}>Risk Level</span>
            <div className="capitalize" style={{ color: T.ink }}>
              {profileData.risk || "Mint"}
            </div>
          </div>
          <div>
            <span style={{ color: T.inkSoft }}>Accessibility mode</span>
            <div style={{ color: T.ink }}>Standard</div>
          </div>
        </div>
      </Card>

      {/* Select Doctor Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div
            className="p-6 rounded-2xl max-w-sm w-full flex flex-col gap-4 shadow-xl"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}
          >
            <h3 className="font-semibold text-base" style={{ color: T.ink }}>
              Select a Doctor to Connect
            </h3>

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
                      onClick={() => handleConnect(doc._id)}
                      disabled={connectingId === doc._id}
                    >
                      {connectingId === doc._id ? "Sending..." : "Connect"}
                    </Button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowDoctorModal(false)}
              className="w-full py-2 text-xs font-semibold rounded-xl"
              style={{ background: T.line, color: T.ink }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ChatBox Modal Overlay */}
      {showChat && linkedDoctor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[60]">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            <button
              onClick={() => setShowChat(false)}
              className="absolute top-4 right-4 z-10 p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <X size={16} style={{ color: T.ink }} />
            </button>
            <ChatBox
              recipientId={linkedDoctor._id}
              recipientName={`Dr. ${linkedDoctor.name}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
