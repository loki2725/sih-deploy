import { apiClient } from "@/services/apiClient.js";
import { useEffect, useState } from "react";
import { AlertTriangle, Bell, KeyRound, Trash2 } from "lucide-react";
import { T } from "@/models/constant.js";
import { Button, Card } from "@/views/components/common/Primitive.jsx";
import { accountController } from "@/controllers/accountController.js";
import { storageModel } from "@/models/storageModel.js";

export function AccountSettings({ onLogout }) {
  const role = storageModel.getRole();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [careNotificationsEnabled, setCareNotificationsEnabled] = useState(true);
  const [loadingCareSettings, setLoadingCareSettings] = useState(role !== "doctor");
  const [savingCareSettings, setSavingCareSettings] = useState(false);

  useEffect(() => {
    if (role !== "doctor") return;

    let cancelled = false;

    const loadCareSettings = async () => {
      try {
        const response = await apiClient("/api/doctor/care-notification-settings");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Could not load notification settings.");
        if (!cancelled) {
          setCareNotificationsEnabled(data.careNotificationsEnabled !== false);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingCareSettings(false);
      }
    };

    loadCareSettings();
    return () => { cancelled = true; };
  }, [role]);

  const toggleCareNotifications = async () => {
    if (savingCareSettings || loadingCareSettings) return;

    const nextValue = !careNotificationsEnabled;
    setError("");
    setMessage("");
    setSavingCareSettings(true);

    try {
      const response = await apiClient("/api/doctor/care-notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ careNotificationsEnabled: nextValue }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Could not update notification settings.");

      setCareNotificationsEnabled(data.careNotificationsEnabled !== false);
      setMessage(
        data.careNotificationsEnabled === false
          ? "Patient care notifications are now off."
          : "Patient care notifications are now on.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCareSettings(false);
    }
  };

  const handleDelete = async () => {
    setError(""); setMessage("");
    if (confirmation !== "DELETE") return setError('Type "DELETE" exactly to confirm account deletion.');
    if (!password) return setError("Enter your current password.");
    if (!window.confirm("This permanently deletes your account and cannot be undone. Continue?")) return;

    setLoading(true);
    try {
      const data = await accountController.deleteAccount({ password, confirmation });
      setMessage(data.message);
      setPassword(""); setConfirmation("");
      setTimeout(onLogout, 700);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: T.primary }}>Account</span>
        <h1 className="text-2xl font-bold" style={{ color: T.ink }}>Account Settings</h1>
        <p className="text-sm mt-1" style={{ color: T.inkSoft }}>Manage your NeuroNest account and notification preferences.</p>
      </div>

      {error && <div className="p-3 rounded-xl text-sm" style={{ border: `1px solid ${T.red}`, color: T.red }}>{error}</div>}
      {message && <div className="p-3 rounded-xl text-sm" style={{ border: `1px solid ${T.line}`, background: T.primarySoft, color: T.primaryDark }}>{message}</div>}

      {role === "doctor" && (
        <Card>
          <div className="flex items-start justify-between gap-5">
            <div className="flex items-start gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${T.primary}15`, color: T.primary }}
              >
                <Bell size={19} />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: T.ink }}>
                  Patient Care Notifications
                </h2>
                <p className="text-sm mt-1" style={{ color: T.inkSoft }}>
                  Receive doctor notifications when a linked patient misses the morning game or leaves a scheduled medication or doctor reminder incomplete.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={careNotificationsEnabled}
              onClick={toggleCareNotifications}
              disabled={loadingCareSettings || savingCareSettings}
              className="relative w-12 h-7 rounded-full flex-shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: careNotificationsEnabled ? T.primary : T.line,
              }}
              aria-label="Toggle patient care notifications"
            >
              <span
                className="absolute top-1 w-5 h-5 rounded-full transition-transform"
                style={{
                  background: T.surface,
                  left: careNotificationsEnabled ? "26px" : "4px",
                }}
              />
            </button>
          </div>

          <div
            className="mt-4 rounded-xl p-3 text-xs"
            style={{
              background: careNotificationsEnabled ? T.primarySoft : T.canvas,
              color: T.inkSoft,
            }}
          >
            <strong style={{ color: T.ink }}>
              {careNotificationsEnabled ? "Notifications are ON." : "Notifications are OFF."}
            </strong>{" "}
            {careNotificationsEnabled
              ? "You will receive doctor-side alerts. Patient reminders continue independently."
              : "No new doctor-side care notifications will be generated. Patient reminder emails are not affected."}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-3 mb-3">
          <KeyRound size={18} color={T.primary} />
          <h2 className="font-semibold" style={{ color: T.ink }}>Password</h2>
        </div>
        <p className="text-sm" style={{ color: T.inkSoft }}>Forgot your password? Sign out and use <strong>Forgot password</strong> on the login screen. A one-time code will be sent to your verified email.</p>
      </Card>

      <Card style={{ border: `1px solid ${T.red}` }}>
        <div className="flex items-center gap-3 mb-2">
          <AlertTriangle size={18} color={T.red} />
          <h2 className="font-semibold" style={{ color: T.red }}>Danger Zone</h2>
        </div>
        <p className="text-sm mb-5" style={{ color: T.inkSoft }}>Deleting your account is permanent. Your account data, appointments and chat history will be removed. {role === "patient" ? "Your medical-record files stored in Cloudinary will also be deleted." : "Your patients’ medical records will remain with the patients."}</p>

        <div className="flex flex-col gap-3">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Current password" className="w-full p-3 rounded-xl outline-none" style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }} />
          <input value={confirmation} onChange={(e) => setConfirmation(e.target.value)} placeholder='Type DELETE to confirm' className="w-full p-3 rounded-xl outline-none" style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }} />
          <Button variant="ghost" disabled={loading} onClick={handleDelete} className="w-full border-2" style={{ borderColor: T.red, color: T.red }}>
            <Trash2 size={16} className="mr-2 inline" /> {loading ? "Deleting account..." : "Permanently delete account"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
