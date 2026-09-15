import { useState, useEffect } from "react";
import { T } from "@/models/constant.js";
import { API_BASE_URL } from "@/models/apiModel.js";
import { ChatBox } from "@/views/components/common/ChatBox.jsx"; // <-- ADDED CHAT IMPORT
import { MessageSquare, LayoutDashboard } from "lucide-react";

export function PatientDashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview"); // <-- ADDED TAB STATE

  // Get user data to find their assigned doctor
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : {};
  const patientId = user._id || user.id;
  const token = localStorage.getItem("token") || user.token;

  // Try to grab the doctor's ID from the patient's user object
  const doctorId = user.doctorId || user.linkedDoctor || user.doctor;

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!token || !patientId) {
          console.error("No authentication token or ID found.");
          setLoading(false);
          return;
        }

        const response = await fetch(
          `${API_BASE_URL}/api/games/history/${patientId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.ok) {
          const data = await response.json();
          const sortedData = data.sort(
            (a, b) => new Date(b.playedAt) - new Date(a.playedAt),
          );
          setHistory(sortedData);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [patientId, token]);

  // Compute live analytics from MongoDB history
  const totalGames = history.length;
  const avgAccuracy = totalGames
    ? Math.round(
        history.reduce((acc, s) => acc + (s.accuracyScore || s.score || 0), 0) /
          totalGames,
      )
    : 0;
  const highestLevel = totalGames
    ? Math.max(...history.map((s) => s.levelReached || s.level || 1))
    : 0;

  const recentSessions = history.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto w-full p-6 space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: T.primaryDark }}
        >
          Patient Overview
        </h1>
        <p className="text-sm" style={{ color: T.inkSoft }}>
          Live metrics calculated from your completed cognitive exercises.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2" style={{ borderColor: T.line }}>
        <button
          onClick={() => setTab("overview")}
          className="px-4 py-2 text-sm rounded-xl font-medium transition-all flex items-center gap-2"
          style={{
            background: tab === "overview" ? T.primary : "transparent",
            color: tab === "overview" ? "#fff" : T.inkSoft,
          }}
        >
          <LayoutDashboard size={16} /> Overview
        </button>
        <button
          onClick={() => setTab("messages")}
          className="px-4 py-2 text-sm rounded-xl font-medium transition-all flex items-center gap-2"
          style={{
            background: tab === "messages" ? T.primary : "transparent",
            color: tab === "messages" ? "#fff" : T.inkSoft,
          }}
        >
          <MessageSquare size={16} /> Messages
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="space-y-8">
          {/* Analytics KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-5 rounded-2xl flex flex-col gap-1 shadow-sm"
              style={{ background: T.surface, border: `1px solid ${T.line}` }}
            >
              <span
                className="text-xs uppercase font-semibold"
                style={{ color: T.inkSoft }}
              >
                Total Sessions
              </span>
              <span className="text-3xl font-bold" style={{ color: T.ink }}>
                {loading ? "..." : totalGames}
              </span>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Completed tests
              </span>
            </div>

            <div
              className="p-5 rounded-2xl flex flex-col gap-1 shadow-sm"
              style={{ background: T.surface, border: `1px solid ${T.line}` }}
            >
              <span
                className="text-xs uppercase font-semibold"
                style={{ color: T.inkSoft }}
              >
                Average Accuracy
              </span>
              <span className="text-3xl font-bold" style={{ color: T.primary }}>
                {loading ? "..." : `${avgAccuracy}%`}
              </span>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Overall precision
              </span>
            </div>

            <div
              className="p-5 rounded-2xl flex flex-col gap-1 shadow-sm"
              style={{ background: T.surface, border: `1px solid ${T.line}` }}
            >
              <span
                className="text-xs uppercase font-semibold"
                style={{ color: T.inkSoft }}
              >
                Highest Level
              </span>
              <span className="text-3xl font-bold" style={{ color: T.ink }}>
                {loading ? "..." : highestLevel}
              </span>
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Working memory peak
              </span>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div
            className="p-6 rounded-2xl shadow-sm"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}
          >
            <h2
              className="text-lg font-bold mb-4"
              style={{ color: T.primaryDark }}
            >
              Recent Activity
            </h2>

            {loading && (
              <p
                className="text-sm py-4 text-center"
                style={{ color: T.inkSoft }}
              >
                Calculating statistics...
              </p>
            )}

            {!loading && history.length === 0 && (
              <p
                className="text-sm py-4 text-center"
                style={{ color: T.inkSoft }}
              >
                No sessions recorded yet. Play a game to see your analytics!
              </p>
            )}

            {!loading && history.length > 0 && (
              <div className="flex flex-col divide-y divide-gray-100">
                {recentSessions.map((session) => {
                  const playedDate = new Date(session.playedAt);
                  const dateStr = playedDate.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  });
                  const timeStr = playedDate.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  // FIXED: Cleanly format game type names for all 3 games!
                  const gameName = session.gameType || "Sequence Memory";

                  return (
                    <div
                      key={session._id}
                      className="py-3 flex items-center justify-between first:pt-0 last:pb-0"
                    >
                      <div>
                        <p
                          className="text-sm font-semibold capitalize"
                          style={{ color: T.ink }}
                        >
                          {gameName}
                        </p>
                        <p className="text-xs" style={{ color: T.inkSoft }}>
                          {dateStr} at {timeStr}
                        </p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span style={{ color: T.inkSoft }}>
                          Level{" "}
                          <strong style={{ color: T.ink }}>
                            {session.levelReached || session.level || 1}
                          </strong>
                        </span>

                        {session.mistakesMade !== undefined && (
                          <span style={{ color: T.inkSoft }}>
                            Mistakes{" "}
                            <strong style={{ color: "#EF4444" }}>
                              {session.mistakesMade}
                            </strong>
                          </span>
                        )}

                        <span
                          className="font-bold min-w-12 text-right"
                          style={{ color: T.primary }}
                        >
                          {session.accuracyScore ?? session.score}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MESSAGES TAB */}
      {tab === "messages" && (
        <div>
          {doctorId ? (
            <ChatBox recipientId={doctorId} recipientName="Your Care Team" />
          ) : (
            <div
              className="text-center p-10 border rounded-2xl"
              style={{ borderColor: T.line, background: T.surface }}
            >
              <MessageSquare
                size={32}
                className="mx-auto mb-3"
                style={{ color: T.inkSoft }}
              />
              <p className="text-sm font-medium" style={{ color: T.ink }}>
                No Primary Doctor Assigned
              </p>
              <p className="text-xs mt-1" style={{ color: T.inkSoft }}>
                Your account is not linked to a physician yet. You will be able
                to message them here once connected.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
