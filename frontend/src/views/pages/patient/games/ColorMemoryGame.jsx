import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, BrainCircuit } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Button, Badge } from "@/views/components/common/Primitive.jsx";

// ---- Game Palette ---------------------------------------------------------
const PALETTE = [
  { id: "coral", hex: "#FF6B5B" },
  { id: "amber", hex: "#F4B740" },
  { id: "lime", hex: "#A6D93B" },
  { id: "teal", hex: "#3FD7C0" },
  { id: "sky", hex: "#4CB4F0" },
  { id: "violet", hex: "#9B7CF0" },
  { id: "rose", hex: "#F15BA0" },
  { id: "steel", hex: "#7C8CB0" },
];
const COLOR_MAP = Object.fromEntries(PALETTE.map((c) => [c.id, c]));

const SHOW_MS = 3000;
const START_LEVEL_LENGTH = 3;

// ---- Helpers ----------------------------------------------------------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sequencesEqual(a, b) {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

function generateSequence(length) {
  if (length <= PALETTE.length) {
    return shuffle(PALETTE)
      .slice(0, length)
      .map((c) => c.id);
  }
  const seq = [];
  let last = null;
  for (let i = 0; i < length; i++) {
    const choices = PALETTE.filter((c) => c.id !== last);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    seq.push(pick.id);
    last = pick.id;
  }
  return seq;
}

function generateOptions(correctSeq) {
  const pool = [correctSeq];
  let attempts = 0;
  while (pool.length < 4 && attempts < 300) {
    attempts++;
    const perm = shuffle(correctSeq);
    if (!pool.some((o) => sequencesEqual(o, perm))) pool.push(perm);
  }
  while (pool.length < 4) {
    const perm = [...correctSeq];
    const i = Math.floor(Math.random() * perm.length);
    const j =
      (i + 1 + Math.floor(Math.random() * (perm.length - 1))) % perm.length;
    [perm[i], perm[j]] = [perm[j], perm[i]];
    if (!pool.some((o) => sequencesEqual(o, perm))) pool.push(perm);
  }
  return shuffle(pool);
}

// ---- Component ----------------------------------------------------------
export function ColorMemoryGame({ onBack }) {
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState([]);
  const [options, setOptions] = useState([]);
  const [phase, setPhase] = useState("idle"); // idle | showing | answering | correct | gameOver
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [peakLevel, setPeakLevel] = useState(1);
  const [gameStartTime, setGameStartTime] = useState(null);

  const timeoutRef = useRef(null);
  const advanceRef = useRef(null);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
  };

  const startRound = useCallback((lvl) => {
    clearTimers();
    const seq = generateSequence(lvl + (START_LEVEL_LENGTH - 1));
    setSequence(seq);
    setOptions([]);
    setSelectedIdx(null);
    setPhase("showing");

    timeoutRef.current = setTimeout(() => {
      setOptions(generateOptions(seq));
      setPhase("answering");
    }, SHOW_MS);
  }, []);

  useEffect(() => clearTimers, []);

  // --- BACKEND INTEGRATION ---
  // --- BACKEND INTEGRATION ---
  // --- BACKEND INTEGRATION ---
  const saveGameSession = async (finalLevel) => {
    // Ensure we don't divide by zero if they click instantly
    const endTime = Date.now();
    const durationSec = Math.max(
      1,
      Math.floor((endTime - gameStartTime) / 1000),
    );

    const score = finalLevel * 150;
    const accuracyScore = Math.min(100, Math.round(50 + finalLevel * 5));
    const avgTimePerLevel = parseFloat((durationSec / finalLevel).toFixed(1));

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return; // Failsafe if user is not found

      const user = JSON.parse(userStr);
      const token = localStorage.getItem("token") || user.token;
      const patientId = user._id || user.id;

      const response = await fetch(`${API_BASE_URL}/api/games/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json`,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          gameType: "Color Memory",
          levelReached: finalLevel,
          level: finalLevel, // Fallback: sending both in case your schema expects "level"
          score: score,
          accuracyScore: accuracyScore,
          mistakesMade: 1, // ADDED: Highly likely required by your GameSession schema!
          duration: durationSec,
          avgTimePerLevel: avgTimePerLevel,
        }),
      });

      // If the backend rejects it (like the 400 error), catch the EXACT reason
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      console.log("✅ Color Memory session saved successfully!");
    } catch (err) {
      console.error("❌ Failed to save session:", err.message);
    }
  };
  const handleStart = () => {
    setLevel(1);
    setPeakLevel(1);
    setGameStartTime(Date.now());
    startRound(1);
  };

  const handleSelect = (opt, idx) => {
    if (phase !== "answering" || selectedIdx !== null) return;
    setSelectedIdx(idx);

    const correct = sequencesEqual(opt, sequence);
    if (correct) {
      setPhase("correct");
      advanceRef.current = setTimeout(() => {
        setLevel((l) => {
          const next = l + 1;
          setPeakLevel(next);
          startRound(next);
          return next;
        });
      }, 1000);
    } else {
      setPhase("gameOver");
      saveGameSession(level);
    }
  };

  const dot = (id, size = 16) => (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: COLOR_MAP[id].hex,
        boxShadow: `0 2px 4px rgba(0,0,0,0.1)`,
      }}
    />
  );

  return (
    <div className="max-w-xl mx-auto w-full pb-10">
      <style>{`
        .cmg-bar-fill { animation: cmg-shrink 3s linear forwards; }
        @keyframes cmg-shrink { from { width: 100%; } to { width: 0%; } }
        .cmg-opt { transition: all 0.2s ease; }
        .cmg-opt:not(:disabled):hover { transform: translateY(-2px); border-color: ${T.primary}; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .cmg-pop { animation: cmg-pop 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes cmg-pop { 0% { transform: scale(0.8); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>

      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: T.inkSoft }}
      >
        <ChevronLeft size={16} /> Back to Games
      </button>

      <Card className="p-8">
        <div
          className="flex items-center justify-between mb-8 pb-4 border-b"
          style={{ borderColor: T.line }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: T.primarySoft, color: T.primary }}
            >
              <BrainCircuit size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: T.ink }}>
                Color Memory
              </h1>
              <p className="text-xs" style={{ color: T.inkSoft }}>
                Visual Working Memory
              </p>
            </div>
          </div>
          {phase !== "idle" && <Badge tone="primary">Level {level}</Badge>}
        </div>

        {phase === "idle" && (
          <div className="text-center py-10">
            <p
              className="mb-8 max-w-sm mx-auto leading-relaxed"
              style={{ color: T.inkSoft }}
            >
              Watch the sequence of colors carefully. When they disappear,
              select the exact matching order from the four options provided.
            </p>
            <Button onClick={handleStart} className="px-8 py-3 text-base">
              Start Assessment
            </Button>
          </div>
        )}

        {phase === "showing" && (
          <div className="py-8">
            <div className="flex flex-wrap justify-center gap-4 min-h-[64px] items-center mb-8 cmg-pop">
              {sequence.map((id, i) => (
                <span key={i}>{dot(id, 48)}</span>
              ))}
            </div>
            <p
              className="text-center text-sm font-medium mb-4"
              style={{ color: T.inkSoft }}
            >
              Memorize this sequence
            </p>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: T.line }}
            >
              <div
                key={level}
                className="h-full rounded-full cmg-bar-fill"
                style={{ background: T.primary }}
              />
            </div>
          </div>
        )}

        {(phase === "answering" || phase === "correct") && (
          <div className="py-4">
            <p
              className="text-center font-medium mb-6"
              style={{ color: phase === "correct" ? "#10B981" : T.ink }}
            >
              {phase === "correct"
                ? "✓ Correct!"
                : "Which sequence did you see?"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {options.map((opt, idx) => {
                const isSelected = selectedIdx === idx;
                const showCorrectGlow = phase === "correct" && isSelected;

                return (
                  <button
                    key={idx}
                    disabled={phase !== "answering"}
                    onClick={() => handleSelect(opt, idx)}
                    className="cmg-opt flex items-center justify-center gap-3 rounded-xl p-4 border"
                    style={{
                      background: showCorrectGlow ? "#ECFDF5" : T.canvas,
                      borderColor: showCorrectGlow
                        ? "#10B981"
                        : isSelected
                          ? T.primary
                          : T.line,
                      cursor: phase === "answering" ? "pointer" : "default",
                    }}
                  >
                    {opt.map((id, i) => (
                      <span key={i}>{dot(id, 20)}</span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "gameOver" && (
          <div className="py-4 cmg-pop">
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                style={{ background: "#FEE2E2", color: "#EF4444" }}
              >
                ✕
              </div>
              <h2 className="text-lg font-bold" style={{ color: T.ink }}>
                Assessment Complete
              </h2>
              <p className="text-sm mt-1" style={{ color: T.inkSoft }}>
                You reached{" "}
                <strong style={{ color: T.primary }}>Level {peakLevel}</strong>
              </p>
            </div>

            <p
              className="text-center text-sm mb-3 font-medium"
              style={{ color: T.ink }}
            >
              The correct sequence was:
            </p>
            <div
              className="flex flex-wrap justify-center gap-3 mb-8 p-4 rounded-xl"
              style={{ background: T.canvas }}
            >
              {sequence.map((id, i) => (
                <span key={i}>{dot(id, 32)}</span>
              ))}
            </div>

            <div
              className="text-center mt-8 pt-6 border-t"
              style={{ borderColor: T.line }}
            >
              <Button onClick={handleStart}>Try Again</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
