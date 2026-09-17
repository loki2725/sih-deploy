import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useEffect } from "react";
import {
  HeartPulse,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Loader2,
  User,
} from "lucide-react";
import { T } from "@/models/constant.js";
import { Card } from "@/views/components/common/Primitive.jsx";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileTypeIcon = ({ mimeType }) => {
  if (mimeType?.startsWith("image/")) return <ImageIcon size={16} color={T.primary} />;
  if (mimeType === "application/pdf") return <FileText size={16} color={T.red} />;
  return <FileIcon size={16} color={T.inkSoft} />;
};

const authHeader = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token") || user.token;
  return { Authorization: `Bearer ${token}` };
};

export function DoctorHealthRecords() {
  const [patients, setPatients] = useState([]);
  const [filesByPatient, setFilesByPatient] = useState({});
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const patientsRes = await fetch(
          `${API_BASE_URL}/api/doctor/patients`,
          { headers: authHeader() },
        );
        if (!patientsRes.ok) throw new Error("Failed to load patients`);
        const data = await patientsRes.json();
        const linked = data.linkedPatients || data || [];
        setPatients(linked);

        // Fetch each linked patient's files in parallel
        const entries = await Promise.all(
          linked.map(async (p) => {
            const id = p._id || p.id;
            try {
              const res = await fetch(
                `${API_BASE_URL}/api/records/patient/${id}`,
                { headers: authHeader() },
              );
              return [id, res.ok ? await res.json() : []];
            } catch {
              return [id, []];
            }
          }),
        );
        setFilesByPatient(Object.fromEntries(entries));
      } catch (error) {
        console.error("Failed to load health records:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleDownload = async (record) => {
    setDownloadingId(record._id);
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/records/${record._id}/download`,
        { headers: authHeader() },
      );
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = record.originalName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download file:", error);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-sm" style={{ color: T.inkSoft }}>
        Loading health records...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: T.ink }}>
          Health Records Hub
        </h1>
        <p className="text-sm" style={{ color: T.inkSoft }}>
          Files your patients have uploaded, grouped by patient.
        </p>
      </div>

      {patients.length === 0 ? (
        <Card>
          <div className="text-sm py-4 text-center" style={{ color: T.inkSoft }}>
            You don't have any linked patients yet.
          </div>
        </Card>
      ) : (
        patients.map((patient) => {
          const id = patient._id || patient.id;
          const files = filesByPatient[id] || [];

          return (
            <Card key={id}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm"
                  style={{ background: T.primarySoft, color: T.primaryDark }}
                >
                  {(patient.name || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: T.ink }}>
                    {patient.name}
                  </div>
                  <div className="text-xs" style={{ color: T.inkSoft }}>
                    {patient.email}
                  </div>
                </div>
              </div>

              {files.length === 0 ? (
                <div
                  className="text-xs py-2 pl-1"
                  style={{ color: T.inkSoft }}
                >
                  No files uploaded yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {files.map((rec) => (
                    <div
                      key={rec._id}
                      className="p-3 rounded-xl flex items-center justify-between border"
                      style={{ borderColor: T.line, background: T.canvas }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileTypeIcon mimeType={rec.mimeType} />
                        <div className="min-w-0">
                          <div
                            className="text-sm font-semibold truncate"
                            style={{ color: T.ink }}
                          >
                            {rec.originalName}
                          </div>
                          <div className="text-xs" style={{ color: T.inkSoft }}>
                            {formatFileSize(rec.fileSize)} •{" "}
                            {new Date(rec.uploadedAt).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric", year: "numeric" },
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(rec)}
                        disabled={downloadingId === rec._id}
                        className="p-2 rounded-lg cursor-pointer hover:opacity-70 disabled:opacity-50 flex-shrink-0"
                        style={{ background: T.primarySoft }}
                        title="Download"
                      >
                        {downloadingId === rec._id ? (
                          <Loader2 size={16} color={T.primary} className="animate-spin" />
                        ) : (
                          <Download size={16} color={T.primary} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
