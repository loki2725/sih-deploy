import { apiClient } from "@/services/apiClient.js";
import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useEffect } from "react";
import { ShieldAlert, Pencil, X, Check, Loader2 } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Button } from "@/views/components/common/Primitive.jsx";

const EMPTY_DETAILS = {
  contactName: "",
  relationship: "",
  phone: "",
  altPhone: "",
  address: "",
  allergies: "",
  notes: "",
};

const FIELDS = [
  { key: "contactName", label: "Contact Name", placeholder: "e.g. Priya Sharma" },
  { key: "relationship", label: "Relationship", placeholder: "e.g. Daughter" },
  { key: "phone", label: "Phone Number", placeholder: "e.g. +91 98765 XXXXX" },
  { key: "altPhone", label: "Alternate Phone", placeholder: "Optional" },
  { key: "address", label: "Home Address", placeholder: "Optional" },
  {
    key: "allergies",
    label: "Allergies",
    placeholder: "e.g. Penicillin, Peanuts",
  },
  {
    key: "notes",
    label: "Other Notes for Responders",
    placeholder: "Anything a helper should know immediately",
    textarea: true,
  },
];

// Editable card the patient can update any time. Accepts the initial
// details + a save callback from the parent so the parent's copy of
// profileData stays in sync after a successful save.
export function EmergencyDetailsCard({ details, onSaved }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_DETAILS, ...details });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Keep local form in sync if the parent's data changes underneath us
  // (e.g. a fresh fetch), but only while we're not mid-edit.
  useEffect(() => {
    if (!isEditing) {
      queueMicrotask(() => setForm({ ...EMPTY_DETAILS, ...details }));
    }
  }, [details, isEditing]);

  const hasAnyDetails = Object.values(details || {}).some((v) => v && v.trim());

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleCancel = () => {
    setForm({ ...EMPTY_DETAILS, ...details });
    setError("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const res = await apiClient(
        `${API_BASE_URL}/api/patient/emergency-details`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save emergency details");
      }

      onSaved?.(data);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <div
          className="font-semibold flex items-center gap-2"
          style={{ color: T.ink }}
        >
          <ShieldAlert size={16} color={T.red} /> Emergency Details
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1 text-xs font-semibold cursor-pointer hover:underline"
            style={{ color: T.primary }}
          >
            <Pencil size={13} /> {hasAnyDetails ? "Edit" : "Add details"}
          </button>
        )}
      </div>

      {!isEditing ? (
        hasAnyDetails ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {FIELDS.filter((f) => details?.[f.key]).map((f) => (
              <div key={f.key} className={f.textarea ? "sm:col-span-2" : ""}>
                <span className="text-xs" style={{ color: T.inkSoft }}>
                  {f.label}
                </span>
                <div style={{ color: T.ink }}>{details[f.key]}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: T.inkSoft }}>
            No emergency contact on file yet. Click{" "}
            <strong>Add details</strong> so responders know who to reach if
            you need help.
          </p>
        )
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <label
                key={f.key}
                className={`block ${f.textarea ? "sm:col-span-2" : ""}`}
              >
                <span
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: T.inkSoft }}
                >
                  {f.label}
                </span>
                {f.textarea ? (
                  <textarea
                    rows={2}
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm outline-none resize-none"
                    style={{
                      border: `1px solid ${T.line}`,
                      borderRadius: "10px",
                      color: T.ink,
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={form[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm outline-none"
                    style={{
                      border: `1px solid ${T.line}`,
                      borderRadius: "10px",
                      color: T.ink,
                    }}
                  />
                )}
              </label>
            ))}
          </div>

          {error && (
            <div className="text-xs" style={{ color: T.red }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-xl cursor-pointer disabled:opacity-50"
              style={{ background: T.line, color: T.ink }}
            >
              <X size={13} /> Cancel
            </button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 py-2 px-3.5 text-xs"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Check size={13} />
              )}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}