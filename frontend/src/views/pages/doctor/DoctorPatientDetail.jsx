import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Plus,
  Timer,
  Activity,
  FileText,
  Filter,
  MessageSquare,
  Download,
  Loader2,
  Image as ImageIcon,
  File as FileIcon,
  Pencil,
  Trash2,
  X,
  Check,
  ClipboardList,
  Bell,
  CalendarDays,
  ChevronLeft as CalendarChevronLeft,
  ChevronRight as CalendarChevronRight,
} from "lucide-react";
import { T } from "@/models/constant.js";
import { Badge, Card, Button } from "@/views/components/common/Primitive.jsx";
import { ChatBox } from "@/views/components/common/ChatBox.jsx"; // <-- ADDED CHAT IMPORT
import { performanceHistory } from "@/models/mockdata.js";
import { careController } from "@/controllers/careController.js";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function DoctorPatientDetail({ patient, onBack }) {
  const [tab, setTab] = useState("overview");
  const tabs = [
    "overview",
    "performance",
    "records",
    "medications",
    "history",
    "messages",
    "care-history",
  ];

  const [gameHistory, setGameHistory] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [gameFilter, setGameFilter] = useState("All Games");

  const [medications, setMedications] = useState(patient.medications || []);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medTime, setMedTime] = useState("");
  const [submittingMed, setSubmittingMed] = useState(false);
  const [doctorReminders, setDoctorReminders] = useState(patient.doctorReminders || []);
  const [reminderText, setReminderText] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [submittingReminder, setSubmittingReminder] = useState(false);
  const [careError, setCareError] = useState("");
  const [careSuccess, setCareSuccess] = useState("");

  // Prescription / reminder history
  const [careHistory, setCareHistory] = useState([]);
  const [loadingCareHistory, setLoadingCareHistory] = useState(false);
  const [selectedCareDate, setSelectedCareDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [careCalendarMonth, setCareCalendarMonth] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  // Uploaded files
  const [patientFiles, setPatientFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [downloadingFileId, setDownloadingFileId] = useState(null);

  // Past Diagnoses (doctor's editable notes)
  const [diagnoses, setDiagnoses] = useState([]);
  const [loadingDiagnoses, setLoadingDiagnoses] = useState(true);
  const [newDiagnosisText, setNewDiagnosisText] = useState("");
  const [addingDiagnosis, setAddingDiagnosis] = useState(false);
  const [editingDiagnosisId, setEditingDiagnosisId] = useState(null);
  const [editingDiagnosisText, setEditingDiagnosisText] = useState("");
  const [savingDiagnosisId, setSavingDiagnosisId] = useState(null);
  const [deletingDiagnosisId, setDeletingDiagnosisId] = useState(null);

  const patientId = patient._id || patient.id;

  useEffect(() => {
    const fetchPatientGames = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const token = localStorage.getItem("token") || user.token;
        if (!patientId) return;

        const response = await fetch(
          `${API_BASE_URL}/api/doctor/patients/${patientId}/games`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (response.ok) {
          const data = await response.json();
          setGameHistory(data);
        }
      } catch (error) {
        console.error("Failed to fetch game history:", error);
      } finally {
        setLoadingGames(false);
      }
    };
    fetchPatientGames();
  }, [patientId]);

  const authHeader = () => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token") || user.token;
    return { Authorization: `Bearer ${token}` };
  };

  const fetchPatientFiles = async () => {
    try {
      if (!patientId) return;
      const response = await fetch(
        `${API_BASE_URL}/api/records/patient/${patientId}`,
        { headers: authHeader() },
      );
      if (response.ok) {
        setPatientFiles(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch patient files:", error);
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchDiagnoses = async () => {
    try {
      if (!patientId) return;
      const response = await fetch(
        `${API_BASE_URL}/api/doctor/patients/${patientId}/diagnoses`,
        { headers: authHeader() },
      );
      if (response.ok) {
        setDiagnoses(await response.json());
      }
    } catch (error) {
      console.error("Failed to fetch past diagnoses:", error);
    } finally {
      setLoadingDiagnoses(false);
    }
  };

  useEffect(() => {
    fetchPatientFiles();
    fetchDiagnoses();
  }, [patientId]);

  const fetchCareHistory = async (dateKey = selectedCareDate) => {
    if (!patientId) return;
    setLoadingCareHistory(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctor/patients/${patientId}/care-history?date=${dateKey}`,
        { headers: authHeader() },
      );
      if (!response.ok) {
        throw new Error("Failed to load care history");
      }
      const data = await response.json();
      setCareHistory(data.history || []);
    } catch (error) {
      console.error("Failed to fetch care history:", error);
      setCareHistory([]);
    } finally {
      setLoadingCareHistory(false);
    }
  };

  useEffect(() => {
    if (tab === "care-history") {
      fetchCareHistory(selectedCareDate);
    }
  }, [patientId, selectedCareDate, tab]);

  const formatDateKey = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const calendarDays = useMemo(() => {
    const year = careCalendarMonth.getFullYear();
    const month = careCalendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstDay; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({
        day,
        dateKey: formatDateKey(year, month, day),
      });
    }

    return cells;
  }, [careCalendarMonth]);

  const selectCareDate = (dateKey) => {
    setSelectedCareDate(dateKey);
  };

  const handleCareMonthChange = (offset) => {
    setCareCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const handleDownloadFile = async (record) => {
    setDownloadingFileId(record._id);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/records/${record._id}/download`,
        { headers: authHeader() },
      );
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
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
      setDownloadingFileId(null);
    }
  };

  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    if (!newDiagnosisText.trim()) return;

    setAddingDiagnosis(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctor/patients/${patientId}/diagnoses`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ text: newDiagnosisText }),
        },
      );
      if (response.ok) {
        setDiagnoses(await response.json());
        setNewDiagnosisText("");
      }
    } catch (error) {
      console.error("Failed to add diagnosis note:", error);
    } finally {
      setAddingDiagnosis(false);
    }
  };

  const startEditingDiagnosis = (note) => {
    setEditingDiagnosisId(note._id);
    setEditingDiagnosisText(note.text);
  };

  const handleSaveDiagnosis = async (noteId) => {
    if (!editingDiagnosisText.trim()) return;
    setSavingDiagnosisId(noteId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctor/patients/${patientId}/diagnoses/${noteId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeader() },
          body: JSON.stringify({ text: editingDiagnosisText }),
        },
      );
      if (response.ok) {
        setDiagnoses(await response.json());
        setEditingDiagnosisId(null);
      }
    } catch (error) {
      console.error("Failed to save diagnosis note:", error);
    } finally {
      setSavingDiagnosisId(null);
    }
  };

  const handleDeleteDiagnosis = async (noteId) => {
    if (!confirm("Delete this note?")) return;
    setDeletingDiagnosisId(noteId);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/doctor/patients/${patientId}/diagnoses/${noteId}`,
        { method: "DELETE", headers: authHeader() },
      );
      if (response.ok) {
        setDiagnoses(await response.json());
      }
    } catch (error) {
      console.error("Failed to delete diagnosis note:", error);
    } finally {
      setDeletingDiagnosisId(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const FileTypeIcon = ({ mimeType }) => {
    if (mimeType?.startsWith("image/"))
      return <ImageIcon size={18} color={T.primary} />;
    if (mimeType === "application/pdf")
      return <FileText size={18} color={T.red} />;
    return <FileIcon size={18} color={T.inkSoft} />;
  };

  const handleAddMedication = async (e) => {
    e.preventDefault();
    if (!medName.trim()) return;

    setSubmittingMed(true);
    setCareError("");
    setCareSuccess("");
    try {
      const updatedMeds = await careController.addMedication(patientId, {
        name: medName,
        dosage: medDosage,
        time: medTime,
      });

      if (updatedMeds) {
        setMedications(updatedMeds);
        setMedName("");
        setMedDosage("");
        setMedTime("");
        setCareSuccess("Medication prescribed successfully.");
      }
    } catch (err) {
      console.error("Failed to add medication:", err);
      setCareError(err?.message || "Could not prescribe medication.");
    } finally {
      setSubmittingMed(false);
    }
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!reminderText.trim() || !reminderTime) return;

    setSubmittingReminder(true);
    setCareError("");
    setCareSuccess("");
    try {
      const updatedReminders = await careController.addDoctorReminder(patientId, {
        text: reminderText,
        time: reminderTime,
      });

      if (updatedReminders) {
        setDoctorReminders(updatedReminders);
        setReminderText("");
        setReminderTime("");
        setCareSuccess("Reminder added for the patient.");
      }
    } catch (error) {
      console.error("Failed to add doctor reminder:", error);
      setCareError(error?.message || "Could not add reminder.");
    } finally {
      setSubmittingReminder(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  const availableGames = useMemo(() => {
    const types = new Set(
      gameHistory.map((g) => {
        if (!g.gameType || g.gameType.toLowerCase() === "sequence")
          return "Sequence";
        return g.gameType;
      }),
    );
    return ["All Games", ...Array.from(types)];
  }, [gameHistory]);

  const dynamicChartData = useMemo(() => {
    const filtered =
      gameFilter === "All Games"
        ? gameHistory
        : gameHistory.filter((g) => {
            const type =
              !g.gameType || g.gameType.toLowerCase() === "sequence"
                ? "Sequence"
                : g.gameType;
            return type === gameFilter;
          });

    if (filtered.length === 0) {
      return performanceHistory.map((item, idx) => ({
        ...item,
        avgTime: parseFloat((4.2 - idx * 0.3).toFixed(1)),
      }));
    }

    return filtered
      .slice()
      .reverse()
      .map((game, index) => {
        const levels = game.levelReached || game.level || 1;
        const durationSec = game.duration || game.timeTaken || 0;
        let avgTime = 0;

        if (game.avgTimePerLevel) avgTime = game.avgTimePerLevel;
        else if (durationSec > 0) avgTime = durationSec / levels;
        else if (game.reactionTime) avgTime = game.reactionTime / 1000;
        else avgTime = Math.max(1.8, +(4.5 - index * 0.2).toFixed(1));

        return {
          session: `S${index + 1}`,
          date: new Date(game.playedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: game.accuracyScore ?? game.score ?? 0,
          avgTime: parseFloat(Number(avgTime).toFixed(1)),
        };
      });
  }, [gameHistory, gameFilter]);

  return (
    <div className="max-w-4xl mx-auto w-full pb-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: T.inkSoft }}
      >
        <ChevronLeft size={16} /> Back to Patients
      </button>

      <div
        className="flex items-center justify-between mb-6 pb-4 border-b"
        style={{ borderColor: T.line }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg"
            style={{ background: T.primarySoft, color: T.primaryDark }}
          >
            {getInitials(patient.name)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg" style={{ color: T.ink }}>
                {patient.name || "Unknown Patient"}
              </h1>
              <Badge tone={patient.risk === "red" ? "amber" : "mint"}>
                {patient.risk ? `${patient.risk.toUpperCase()} RISK` : "ACTIVE"}
              </Badge>
            </div>
            <div className="text-xs" style={{ color: T.inkSoft }}>
              {patient.age ? `${patient.age} yrs` : "Age not specified"} •{" "}
              {patient.condition || "No condition listed"} • ID: MC-
              {patient.patientConnectionCode || "--------"}
            </div>
          </div>
        </div>
        <Badge tone="primary">Primary Care Portal</Badge>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm rounded-xl capitalize whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5"
            style={{
              background: tab === t ? T.primary : T.surface,
              color: tab === t ? "#fff" : T.inkSoft,
              border: `1px solid ${tab === t ? T.primary : T.line}`,
              fontWeight: tab === t ? "600" : "500",
            }}
          >
            {t === "messages" && <MessageSquare size={14} />}
            {t === "care-history" && <CalendarDays size={14} />}
            {t === "care-history" ? "Care History" : t}
          </button>
        ))}
      </div>

      {(tab === "overview" || tab === "performance") && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-end gap-2">
            <Filter size={16} style={{ color: T.inkSoft }} />
            <select
              value={gameFilter}
              onChange={(e) => setGameFilter(e.target.value)}
              className="p-2 rounded-xl text-sm font-medium outline-none cursor-pointer border"
              style={{
                background: T.surface,
                borderColor: T.line,
                color: T.ink,
              }}
            >
              {availableGames.map((game) => (
                <option key={game} value={game}>
                  {game}
                </option>
              ))}
            </select>
          </div>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div
                  className="font-semibold text-sm flex items-center gap-2"
                  style={{ color: T.ink }}
                >
                  <Activity size={16} color={T.primary} />
                  Cognitive Performance Trend
                </div>
                <p className="text-xs" style={{ color: T.inkSoft }}>
                  Session accuracy percentage over time
                </p>
              </div>
              <Badge tone="mint">Accuracy Metric</Badge>
            </div>

            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={dynamicChartData}>
                  <CartesianGrid stroke={T.line} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: T.inkSoft }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    unit="%"
                    tick={{ fontSize: 11, fill: T.inkSoft }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: T.surface,
                      border: `1px solid ${T.line}`,
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(val) => [`${val}%`, "Accuracy"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke={T.primary}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: T.primary }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div
                  className="font-semibold text-sm flex items-center gap-2"
                  style={{ color: T.ink }}
                >
                  <Timer size={16} className="text-amber-500" />
                  Average Level Completion Speed
                </div>
                <p className="text-xs" style={{ color: T.inkSoft }}>
                  Seconds per level (lower values denote quicker cognitive
                  processing)
                </p>
              </div>
              <Badge tone="amber">Processing Speed</Badge>
            </div>

            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={dynamicChartData}>
                  <CartesianGrid stroke={T.line} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: T.inkSoft }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, "dataMax + 2"]}
                    unit="s"
                    tick={{ fontSize: 11, fill: T.inkSoft }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: T.surface,
                      border: `1px solid ${T.line}`,
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(val) => [`${val} seconds`, "Avg Time / Level"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgTime"
                    stroke="#C58B3A"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#C58B3A" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {tab === "records" && (
        <div className="flex flex-col gap-6">
        <Card>
          <div
            className="font-semibold mb-4 flex items-center gap-2"
            style={{ color: T.ink }}
          >
            <FileText size={16} /> Clinical Health Profile
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3 rounded-xl" style={{ background: T.canvas }}>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Full Name
              </span>
              <div className="font-medium" style={{ color: T.ink }}>
                {patient.name}
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: T.canvas }}>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Age
              </span>
              <div className="font-medium" style={{ color: T.ink }}>
                {patient.age ? `${patient.age} years` : "Not documented"}
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: T.canvas }}>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Clinical Diagnosis
              </span>
              <div className="font-medium" style={{ color: T.ink }}>
                {patient.condition || "None listed"}
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: T.canvas }}>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Assessed Risk Profile
              </span>
              <div className="font-medium capitalize" style={{ color: T.ink }}>
                {patient.risk || "Standard (Mint)"}
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: T.canvas }}>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Account Email
              </span>
              <div className="font-medium" style={{ color: T.ink }}>
                {patient.email}
              </div>
            </div>
            <div className="p-3 rounded-xl" style={{ background: T.canvas }}>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Active Prescriptions
              </span>
              <div className="font-medium" style={{ color: T.ink }}>
                {medications.length} registered medications
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div
            className="font-semibold mb-4 flex items-center gap-2"
            style={{ color: T.ink }}
          >
            <FileText size={16} /> Uploaded Files
          </div>

          {loadingFiles ? (
            <div className="text-sm py-2" style={{ color: T.inkSoft }}>
              Loading files...
            </div>
          ) : patientFiles.length === 0 ? (
            <div className="text-sm py-2" style={{ color: T.inkSoft }}>
              This patient hasn't uploaded any records yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {patientFiles.map((rec) => (
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
                    onClick={() => handleDownloadFile(rec)}
                    disabled={downloadingFileId === rec._id}
                    className="p-2 rounded-lg cursor-pointer hover:opacity-70 disabled:opacity-50 flex-shrink-0"
                    style={{ background: T.primarySoft }}
                    title="Download"
                  >
                    {downloadingFileId === rec._id ? (
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

        <Card>
          <div
            className="font-semibold mb-4 flex items-center gap-2"
            style={{ color: T.ink }}
          >
            <ClipboardList size={16} /> Past Diagnoses
          </div>

          <form onSubmit={handleAddDiagnosis} className="flex gap-2 mb-4">
            <input
              value={newDiagnosisText}
              onChange={(e) => setNewDiagnosisText(e.target.value)}
              placeholder="Add a note about this patient's history..."
              className="flex-1 p-2.5 rounded-xl text-sm outline-none border"
              style={{ borderColor: T.line, color: T.ink }}
            />
            <Button
              type="submit"
              disabled={addingDiagnosis || !newDiagnosisText.trim()}
              className="py-2 px-4 text-sm"
            >
              {addingDiagnosis ? "Adding..." : "Add"}
            </Button>
          </form>

          {loadingDiagnoses ? (
            <div className="text-sm py-2" style={{ color: T.inkSoft }}>
              Loading notes...
            </div>
          ) : diagnoses.length === 0 ? (
            <div className="text-sm py-2" style={{ color: T.inkSoft }}>
              No notes yet for this patient.
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {diagnoses
                .slice()
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((note) => (
                  <li
                    key={note._id}
                    className="p-3 rounded-xl flex items-start gap-2 border"
                    style={{ borderColor: T.line, background: T.canvas }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                      style={{ background: T.primary }}
                    />

                    {editingDiagnosisId === note._id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          value={editingDiagnosisText}
                          onChange={(e) => setEditingDiagnosisText(e.target.value)}
                          className="flex-1 p-1.5 rounded-lg text-sm outline-none border"
                          style={{ borderColor: T.line, color: T.ink }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveDiagnosis(note._id)}
                          disabled={savingDiagnosisId === note._id}
                          className="cursor-pointer"
                        >
                          <Check size={16} color={T.mint} />
                        </button>
                        <button
                          onClick={() => setEditingDiagnosisId(null)}
                          className="cursor-pointer"
                        >
                          <X size={16} color={T.inkSoft} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm" style={{ color: T.ink }}>
                            {note.text}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
                            {new Date(
                              note.updatedAt || note.createdAt,
                            ).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => startEditingDiagnosis(note)}
                            className="cursor-pointer"
                          >
                            <Pencil size={14} style={{ color: T.inkSoft }} />
                          </button>
                          <button
                            onClick={() => handleDeleteDiagnosis(note._id)}
                            disabled={deletingDiagnosisId === note._id}
                            className="cursor-pointer"
                          >
                            <Trash2 size={14} color={T.red} />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </Card>
        </div>
      )}

      {tab === "medications" && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="font-semibold mb-3" style={{ color: T.ink }}>
              Prescribe New Medication
            </div>
            <form
              onSubmit={handleAddMedication}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="text"
                placeholder="Medicine Name (e.g. Donepezil)"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                required
                className="p-2.5 rounded-xl text-sm flex-1 outline-none"
                style={{
                  border: `1px solid ${T.line}`,
                  background: T.surface,
                  color: T.ink,
                }}
              />
              <input
                type="text"
                placeholder="Dosage (e.g. 10mg)"
                value={medDosage}
                onChange={(e) => setMedDosage(e.target.value)}
                className="p-2.5 rounded-xl text-sm flex-1 outline-none"
                style={{
                  border: `1px solid ${T.line}`,
                  background: T.surface,
                  color: T.ink,
                }}
              />
              <input
                type="time"
                aria-label="Medication time"
                value={medTime}
                onChange={(e) => setMedTime(e.target.value)}
                required
                className="p-2.5 rounded-xl text-sm flex-1 outline-none"
                style={{
                  border: `1px solid ${T.line}`,
                  background: T.surface,
                  color: T.ink,
                }}
              />
              <Button
                type="submit"
                disabled={submittingMed}
                className="flex items-center justify-center gap-1"
              >
                <Plus size={16} /> {submittingMed ? "Adding..." : "Prescribe"}
              </Button>
            </form>
          </Card>

          <Card>
            <div className="font-semibold mb-3 flex items-center gap-2" style={{ color: T.ink }}>
              <Bell size={16} /> Add Doctor Reminder
            </div>
            <form onSubmit={handleAddReminder} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Reminder (e.g. Take a short walk)"
                value={reminderText}
                onChange={(e) => setReminderText(e.target.value)}
                required
                className="p-2.5 rounded-xl text-sm flex-1 outline-none"
                style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }}
              />
              <input
                type="time"
                aria-label="Reminder time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                required
                className="p-2.5 rounded-xl text-sm outline-none"
                style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }}
              />
              <Button type="submit" disabled={submittingReminder || !reminderText.trim() || !reminderTime} className="flex items-center justify-center gap-1">
                <Plus size={16} /> {submittingReminder ? "Adding..." : "Add Reminder"}
              </Button>
            </form>
          </Card>

          <Card>
            <div className="font-semibold mb-3" style={{ color: T.ink }}>
              Doctor Reminders
            </div>
            {doctorReminders.length === 0 ? (
              <div className="text-sm py-3" style={{ color: T.inkSoft }}>
                No reminders added yet.
              </div>
            ) : (
              doctorReminders.map((reminder, i) => (
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
                      {reminder.time} · reminder email after 10 minutes if unchecked
                    </div>
                  </div>
                  <Badge tone={reminder.checked ? "mint" : "amber"}>
                    {reminder.checked ? "Checked ✓" : "Pending"}
                  </Badge>
                </div>
              ))
            )}
          </Card>

          <Card>
            <div className="font-semibold mb-3" style={{ color: T.ink }}>
              Current Prescriptions
            </div>
            {medications.length === 0 ? (
              <div
                className="text-sm py-4 text-center"
                style={{ color: T.inkSoft }}
              >
                No active medications prescribed.
              </div>
            ) : (
              medications.map((m, i) => (
                <div
                  key={m._id || i}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: T.ink }}
                  >
                    {m.name}{m.dosage ? ` (${m.dosage})` : ""}{" "}
                    <span style={{ color: T.inkSoft }}>• {m.time}</span>
                  </span>
                  <Badge tone={m.taken ? "mint" : "amber"}>
                    {m.taken ? "Taken ✓" : "Prescribed"}
                  </Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      )}

      {tab === "history" && (
        <Card>
          <div className="font-semibold mb-3" style={{ color: T.ink }}>
            Recent Activity & Game Sessions
          </div>
          {loadingGames ? (
            <div
              className="text-sm py-4 text-center"
              style={{ color: T.inkSoft }}
            >
              Loading history...
            </div>
          ) : gameHistory.length === 0 ? (
            <div
              className="text-sm py-4 text-center"
              style={{ color: T.inkSoft }}
            >
              No games played yet.
            </div>
          ) : (
            gameHistory.map((game, i) => {
              const displayType =
                !game.gameType || game.gameType.toLowerCase() === "sequence"
                  ? "Sequence"
                  : game.gameType;

              return (
                <div
                  key={game._id || i}
                  className="flex items-center justify-between py-2.5"
                  style={{ borderTop: i > 0 ? `1px solid ${T.line}` : "none" }}
                >
                  <div>
                    <span
                      className="text-sm font-medium capitalize"
                      style={{ color: T.ink }}
                    >
                      Completed {displayType} Level{" "}
                      {game.levelReached || game.level || 1}
                    </span>
                    <div className="text-xs" style={{ color: T.inkSoft }}>
                      {new Date(game.playedAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={game.accuracyScore >= 80 ? "mint" : "amber"}>
                      {game.accuracyScore}% Accuracy
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      )}

      {tab === "care-history" && (
        <div className="flex flex-col gap-5">
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="font-semibold flex items-center gap-2" style={{ color: T.ink }}>
                  <CalendarDays size={18} color={T.primary} />
                  Care History
                </div>
                <p className="text-xs mt-1" style={{ color: T.inkSoft }}>
                  Select a date to review medications and reminders prescribed for {patient.name}.
                </p>
              </div>
              <div
                className="text-sm font-semibold px-3 py-2 rounded-xl"
                style={{ background: T.primarySoft, color: T.primary }}
              >
                {selectedCareDate}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => handleCareMonthChange(-1)}
                className="p-2 rounded-lg cursor-pointer"
                style={{ color: T.inkSoft, background: T.canvas }}
                aria-label="Previous month"
              >
                <CalendarChevronLeft size={18} />
              </button>

              <div className="font-semibold text-sm" style={{ color: T.ink }}>
                {careCalendarMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </div>

              <button
                type="button"
                onClick={() => handleCareMonthChange(1)}
                className="p-2 rounded-lg cursor-pointer"
                style={{ color: T.inkSoft, background: T.canvas }}
                aria-label="Next month"
              >
                <CalendarChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-2 font-semibold" style={{ color: T.inkSoft }}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, index) =>
                cell ? (
                  <button
                    key={cell.dateKey}
                    type="button"
                    onClick={() => selectCareDate(cell.dateKey)}
                    className="h-10 rounded-lg text-sm font-semibold cursor-pointer transition-all"
                    style={{
                      background:
                        selectedCareDate === cell.dateKey
                          ? T.primary
                          : T.canvas,
                      color:
                        selectedCareDate === cell.dateKey
                          ? T.surface
                          : T.ink,
                      border:
                        selectedCareDate === cell.dateKey
                          ? `1px solid ${T.primary}`
                          : `1px solid ${T.line}`,
                    }}
                  >
                    {cell.day}
                  </button>
                ) : (
                  <div key={`blank-${index}`} className="h-10" />
                ),
              )}
            </div>
          </Card>

          <Card>
            <div className="font-semibold mb-3" style={{ color: T.ink }}>
              Prescriptions & Tasks — {selectedCareDate}
            </div>

            {loadingCareHistory ? (
              <div className="py-6 text-center text-sm" style={{ color: T.inkSoft }}>
                Loading care history...
              </div>
            ) : careHistory.length === 0 ? (
              <div className="py-6 text-center text-sm" style={{ color: T.inkSoft }}>
                No medications or reminders were prescribed for this date.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {careHistory.map((item) => {
                  const isMedication = item.type === "medication";
                  return (
                    <div
                      key={item._id}
                      className="rounded-xl p-4 flex items-center justify-between gap-3"
                      style={{ background: T.canvas, border: `1px solid ${T.line}` }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: T.primarySoft }}
                        >
                          {isMedication ? (
                            <Pill size={16} color={T.primary} />
                          ) : (
                            <Bell size={16} color={T.primary} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold break-words" style={{ color: T.ink }}>
                            {isMedication ? item.name : item.text || item.name}
                          </div>
                          <div className="text-xs mt-1" style={{ color: T.inkSoft }}>
                            {isMedication
                              ? `${item.dosage || "Dosage not specified"} · Scheduled ${item.time}`
                              : `Reminder · Scheduled ${item.time}`}
                          </div>
                          <div className="text-[11px] mt-1" style={{ color: T.inkSoft }}>
                            Prescribed {new Date(item.prescribedAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>

                      <Badge
                        tone={
                          item.status === "completed"
                            ? "mint"
                            : item.status === "missed"
                              ? "amber"
                              : "primary"
                        }
                      >
                        {item.status === "completed"
                          ? "Completed"
                          : item.status === "missed"
                            ? "Missed"
                            : "Pending"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* CHAT TAB INTEGRATION */}
      {tab === "messages" && (
        <ChatBox recipientId={patientId} recipientName={patient.name} />
      )}
    </div>
  );
}
