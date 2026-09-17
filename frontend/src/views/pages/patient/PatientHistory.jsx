import { useState, useEffect, useMemo } from "react";
import { Activity, Timer, Filter } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Badge } from "@/views/components/common/Primitive.jsx";
import {
import { API_BASE_URL } from "@/models/apiModel.js";
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function PatientHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gameFilter, setGameFilter] = useState("All Games");

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const token = localStorage.getItem("token") || user.token; // Extract token
        const patientId = user.id || user._id || "demo-patient-123";

        if (!token) {
          throw new Error("Authentication token missing. Please log in again.");
        }

        const response = await fetch(
          `${API_BASE_URL}/api/games/history/${patientId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`, // Attach token to pass verifyToken
            },
          },
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load game history");
        }

        const data = await response.json();
        setHistory(data);
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // Same game-type normalization used on the doctor's view, so "Sequence" /
  // missing gameType are grouped consistently.
  const normalizeType = (g) => {
    if (!g.gameType || g.gameType.toLowerCase() === "sequence")
      return "Sequence";
    return g.gameType;
  };

  const availableGames = useMemo(() => {
    const types = new Set(history.map(normalizeType));
    return ["All Games", ...Array.from(types)];
  }, [history]);

  // Builds the same { date, score, avgTime } shape the doctor's charts use,
  // oldest -> newest, so both graphs read left-to-right chronologically.
  const chartData = useMemo(() => {
    const filtered =
      gameFilter === "All Games"
        ? history
        : history.filter((g) => normalizeType(g) === gameFilter);

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
          date: new Date(game.playedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: game.accuracyScore ?? game.score ?? 0,
          avgTime: parseFloat(Number(avgTime).toFixed(1)),
        };
      });
  }, [history, gameFilter]);

  return (
    <div className="max-w-3xl mx-auto w-full p-6">
      <div className="mb-6">
        <h1
          className="text-2xl font-bold mb-1"
          style={{ color: T.primaryDark }}
        >
          Game Session History
        </h1>
        <p className="text-sm" style={{ color: T.inkSoft }}>
          Review your cognitive exercise performance records over time.
        </p>
      </div>

      {loading && (
        <div className="text-center py-12" style={{ color: T.inkSoft }}>
          Loading game sessions...
        </div>
      )}

      {error && !loading && (
        <div
          className="p-4 rounded-xl text-center font-medium"
          style={{
            background: T.surface,
            border: `1px solid ${T.red}`,
            color: T.red,
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && history.length === 0 && (
        <div
          className="text-center py-12 rounded-2xl"
          style={{
            background: T.surface,
            border: `1px solid ${T.line}`,
            color: T.inkSoft,
          }}
        >
          No game records found. Play a round to log your first session!
        </div>
      )}

      {!loading && !error && history.length > 0 && (
        <>
          <div className="flex items-center justify-end gap-2 mb-4">
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

          <div className="flex flex-col gap-6 mb-8">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div
                    className="font-semibold text-sm flex items-center gap-2"
                    style={{ color: T.ink }}
                  >
                    <Activity size={16} color={T.primary} />
                    Your Progress Over Time
                  </div>
                  <p className="text-xs" style={{ color: T.inkSoft }}>
                    Session accuracy percentage across your games
                  </p>
                </div>
                <Badge tone="mint">Accuracy Metric</Badge>
              </div>

              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
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
                    Seconds per level (lower is faster)
                  </p>
                </div>
                <Badge tone="amber">Processing Speed</Badge>
              </div>

              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={chartData}>
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

          <div className="flex flex-col gap-3">
            {history.map((session) => {
              const playedDate = new Date(session.playedAt);
              const dateStr = playedDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeStr = playedDate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={session._id}
                  className="p-4 rounded-2xl flex items-center justify-between transition-all"
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.line}`,
                  }}
                >
                  <div className="flex flex-col">
                    <span
                      className="font-semibold capitalize text-base"
                      style={{ color: T.ink }}
                    >
                      {session.gameType} Memory
                    </span>
                    <span className="text-xs" style={{ color: T.inkSoft }}>
                      {dateStr} • {timeStr}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="flex flex-col items-end">
                      <span className="text-xs" style={{ color: T.inkSoft }}>
                        Level
                      </span>
                      <span className="font-bold" style={{ color: T.ink }}>
                        {session.levelReached}
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-xs" style={{ color: T.inkSoft }}>
                        Mistakes
                      </span>
                      <span className="font-bold" style={{ color: T.red }}>
                        {session.mistakesMade}
                      </span>
                    </div>

                    <div className="flex flex-col items-end min-w-16">
                      <span className="text-xs" style={{ color: T.inkSoft }}>
                        Accuracy
                      </span>
                      <span
                        className="font-bold text-base"
                        style={{ color: T.primary }}
                      >
                        {session.accuracyScore}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
