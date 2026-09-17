import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { T } from "@/models/constant.js";
import { Card } from "@/views/components/common/Primitive.jsx";

const formatFileSize = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileTypeIcon = ({ mimeType }) => {
  if (mimeType?.startsWith("image/")) return <ImageIcon size={20} color={T.primary} />;
  if (mimeType === "application/pdf") return <FileText size={20} color={T.red} />;
  return <FileIcon size={20} color={T.inkSoft} />;
};

const getAuthToken = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  return localStorage.getItem("token") || user.token;
};

export function PatientRecords() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // { name, state: "pending" | "uploaded" } while a file is mid-upload or
  // just finished - null once the whole thing settles back to normal.
  const [uploadStatus, setUploadStatus] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const fileInputRef = useRef(null);

  const fetchRecords = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/records/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load your records");
      const data = await res.json();
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus({ name: file.name, state: "pending" });
    setError(null);

    try {
      const token = getAuthToken();
      const formData = new FormData();
      formData.append("file", file);

      // This single request covers the whole trip - multer receiving the
      // file, then us pushing it up to Cloudinary server-side - so
      // "pending" covers that entire window from the UI's perspective.
      const res = await fetch(`${API_BASE_URL}/api/records/upload`, {
        method: "POST`,
        headers: { Authorization: `Bearer ${token}` }, // don't set Content-Type - browser sets the multipart boundary
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Upload failed");
      }

      await fetchRecords();

      // Flip to "Uploaded", then clear the banner shortly after so the
      // file just shows normally in the list below.
      setUploadStatus({ name: file.name, state: "uploaded" });
      setTimeout(() => setUploadStatus(null), 1800);
    } catch (err) {
      setError(err.message);
      setUploadStatus(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // The download endpoint requires an Authorization header, so a plain
  // <a href> won't work - fetch it as a blob and trigger the save manually.
  const handleDownload = async (record) => {
    setDownloadingId(record._id);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/api/records/${record._id}/download`,
        { headers: { Authorization: `Bearer ${token}` } },
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
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: T.primaryDark }}>
          My Medical Records
        </h1>
        <p className="text-sm" style={{ color: T.inkSoft }}>
          Upload previous records, prescriptions, or medication history for
          your doctor to review.
        </p>
      </div>

      {error && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{ background: T.surface, border: `1px solid ${T.red}`, color: T.red }}
        >
          {error}
        </div>
      )}

      <Card
        onClick={uploadStatus ? undefined : () => fileInputRef.current?.click()}
        className={uploadStatus ? "cursor-not-allowed" : "cursor-pointer"}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelected}
          disabled={!!uploadStatus}
        />
        <div
          className="w-full flex flex-col items-center justify-center gap-2 py-10 rounded-2xl transition-all"
          style={{
            border: `2px dashed ${T.line}`,
            background: T.canvas,
            opacity: uploadStatus ? 0.6 : 1,
          }}
        >
          {uploadStatus ? (
            <>
              <Loader2 size={28} color={T.primary} className="animate-spin" />
              <span className="text-sm font-medium" style={{ color: T.ink }}>
                {uploadStatus.state === "pending" ? "Uploading..." : "Done!"}
              </span>
            </>
          ) : (
            <>
              <Upload size={28} color={T.primary} />
              <span className="text-sm font-semibold" style={{ color: T.ink }}>
                Click to upload a file
              </span>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Any file type — PDF, image, document. Up to 25MB.
              </span>
            </>
          )}
        </div>

        {/* Pending -> Uploaded status chip for the file currently in flight */}
        {uploadStatus && (
          <div
            className="mt-3 p-3 rounded-xl flex items-center gap-3"
            style={{
              background:
                uploadStatus.state === "uploaded" ? T.mintSoft : T.primarySoft,
              border: `1px solid ${
                uploadStatus.state === "uploaded" ? T.mint : T.primary
              }`,
            }}
          >
            {uploadStatus.state === "pending" ? (
              <Clock size={16} color={T.primary} className="flex-shrink-0" />
            ) : (
              <CheckCircle2 size={16} color={T.mint} className="flex-shrink-0" />
            )}
            <div className="min-w-0">
              <div
                className="text-sm font-semibold truncate"
                style={{ color: uploadStatus.state === "uploaded" ? T.mint : T.primaryDark }}
              >
                {uploadStatus.name}
              </div>
              <div className="text-xs" style={{ color: T.inkSoft }}>
                {uploadStatus.state === "pending" ? "Pending..." : "Uploaded"}
              </div>
            </div>
          </div>
        )}
      </Card>

      <Card>
        <div className="font-semibold mb-3" style={{ color: T.ink }}>
          Uploaded Files
        </div>

        {loading ? (
          <div className="text-sm py-4" style={{ color: T.inkSoft }}>
            Loading your files...
          </div>
        ) : records.length === 0 ? (
          <div className="text-sm py-4" style={{ color: T.inkSoft }}>
            You haven't uploaded any files yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {records.map((rec) => (
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
                      {new Date(rec.uploadedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
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
    </div>
  );
}
