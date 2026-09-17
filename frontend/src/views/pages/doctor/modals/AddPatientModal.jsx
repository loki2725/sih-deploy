import { useState } from "react";
import { Check } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Field, Button } from "@/views/components/common/Primitive.jsx";
import { API_BASE_URL } from "@/models/apiModel.js";

export function AddPatientModal({ onClose, onConnected }) {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState("idle");

  const submit = async () => {
    if (!code.trim()) return;
    setStatus("pending");

    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const token = localStorage.getItem("token") || user.token;

      const response = await fetch(`${API_BASE_URL}/api/doctor/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        setStatus("approved");
      } else {
        setStatus("idle");
        alert("Invalid connection code.");
      }
    } catch (error) {
      console.error("Connection failed", error);
      setStatus("idle");
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-8 z-50"
      style={{ background: "rgba(31,32,51,0.4)" }}
    >
      <Card
        className="w-full max-w-sm shadow-2xl"
        style={{ background: T.surface }}
      >
        <div className="font-semibold mb-1" style={{ color: T.ink }}>
          Add Patient
        </div>
        <p className="text-xs mb-4" style={{ color: T.inkSoft }}>
          Enter the connection code shared by the patient
        </p>

        {status === "idle" && (
          <>
            <Field
              label="Connection code"
              placeholder="MC-XXXX-XX"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={submit} className="flex-1">
                Connect
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {status === "pending" && (
          <div className="text-center py-4">
            <div className="text-sm mb-2" style={{ color: T.ink }}>
              Verifying code...
            </div>
            <div className="text-xs" style={{ color: T.inkSoft }}>
              Connecting to patient profile
            </div>
          </div>
        )}

        {status === "approved" && (
          <div className="text-center py-4">
            <div
              className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center"
              style={{ background: T.mintSoft }}
            >
              <Check size={20} color={T.mint} />
            </div>
            <div className="text-sm font-medium mb-1" style={{ color: T.ink }}>
              Access granted
            </div>
            <p className="text-xs mb-4" style={{ color: T.inkSoft }}>
              You can now view this patient's records and performance.
            </p>
            <Button onClick={onConnected} className="w-full">
              Done
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
