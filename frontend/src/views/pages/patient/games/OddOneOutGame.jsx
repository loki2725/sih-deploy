import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  Shapes,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Pentagon,
  Eye,
  Sparkles,
  Trophy,
} from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Button, Badge } from "@/views/components/common/Primitive.jsx";

// ---- Shape difficulty curve ---------------------------------------------
// Ordered from most visually distinct pair to most subtle pair. Every two
// rounds we step to the next (harder) pair, then hold at the last one.
const SHAPE_ICONS = { Circle, Square, Triangle, Hexagon, Pentagon };
const SHAPE_PAIRS = [
  { base: "Circle", odd: "Square" },
  { base: "Square", odd: "Triangle" },
  { base: "Circle", odd: "Hexagon" },
  { base: "Pentagon", odd: "Hexagon" },
];

// ---- Grid / color difficulty curve ---------------------------------------
const MIN_GRID = 4;
const MAX_GRID = 24;
const GRID_STEP = 2;
const MAX_COLS = 6;
const MIN_HUE_SHIFT = 12;
const START_HUE_SHIFT = 42;
const HUE_DECAY = 3;
const BEST_KEY = "neuronest_oddOneOut_best";

const ENCOURAGEMENTS = ["Nice eye!", "Sharp!", "Well spotted!", "Excellent!"];

function gridSizeForRound(round) {
  return Math.min(MAX_GRID, MIN_GRID + (round - 1) * GRID_STEP);
}
function colsForSize(size) {
  return Math.min(MAX_COLS, Math.ceil(Math.sqrt(size)));
}
function shapePairForRound(round) {
  const tier = Math.min(SHAPE_PAIRS.length - 1, Math.floor((round - 1) / 2));
  return SHAPE_PAIRS[tier];
}
function hueShiftForRound(round) {
  return Math.max(MIN_HUE_SHIFT, START_HUE_SHIFT - (round - 1) * HUE_DECAY);
}
function difficultyForRound(round) {
  if (round <= 2) return { label: "Easy", tone: "mint" };
  if (round <= 5) return { label: "Medium", tone: "amber" };
  return { label: "Hard", tone: "red" };
}
function loadBest() {
  try {
    const raw = JSON.parse(localStorage.getItem(BEST_KEY) || "null");
    if (raw && typeof raw.score === "number") return raw;
  } catch {
    /* ignore malformed storage */
  }
  return { score: 0, round: 0 };
}

// ---- Component ------------------------------------------------------------
export function OddOneOutGame({ onBack }) {
  const [mode, setMode] = useState("shape"); // shape | color
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [peakRound, setPeakRound] = useState(1);
  const [phase, setPhase] = useState("idle"); // idle | playing | correct | wrong | gameOver
  const [gridSize, setGridSize] = useState(MIN_GRID);
  const [cols, setCols] = useState(2);
  const [oddIndex, setOddIndex] = useState(0);
  const [wrongIndex, setWrongIndex] = useState(null);
  const [shapePair, setShapePair] = useState(SHAPE_PAIRS[0]);
  const [colorTier, setColorTier] = useState({ hue: 200, shift: START_HUE_SHIFT });
  const [gameStartTime, setGameStartTime] = useState(null);
  const [best, setBest] = useState(loadBest);
  const [isNewBest, setIsNewBest] = useState(false);
  const [cheer, setCheer] = useState(ENCOURAGEMENTS[0]);

  const advanceRef = useRef(null);
  const lockedRef = useRef(false);

  const clearTimers = () => {
    if (advanceRef.current) clearTimeout(advanceRef.current);
  };
  useEffect(() => clearTimers, []);

  const startRound = useCallback(
    (r) => {
      clearTimers();
      lockedRef.current = false;
      const size = gridSizeForRound(r);
      setGridSize(size);
      setCols(colsForSize(size));
      setOddIndex(Math.floor(Math.random() * size));
      setWrongIndex(null);

      if (mode === "shape") {
        setShapePair(shapePairForRound(r));
      } else {
        setColorTier({
          hue: Math.floor(Math.random() * 360),
          shift: hueShiftForRound(r),
        });
      }
      setPhase("playing");
    },
    [mode],
  );

  const handleStart = () => {
    setRound(1);
    setPeakRound(1);
    setScore(0);
    setIsNewBest(false);
    setGameStartTime(Date.now());
    startRound(1);
  };

  const saveGameSession = async (roundsCleared) => {
    const endTime = Date.now();
    const durationSec = Math.max(
      1,
      Math.floor((endTime - gameStartTime) / 1000),
    );
    const accuracyScore = Math.min(100, Math.round(50 + roundsCleared * 5));

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
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
          gameType: "Odd One Out",
          levelReached: roundsCleared,
          level: roundsCleared,
          score,
          accuracyScore,
          mistakesMade: 1,
          duration: durationSec,
          mode,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to save Odd One Out session:", err.message);
    }
  };

  const handleGameOver = (roundsCleared) => {
    setPhase("gameOver");
    setScore((finalScore) => {
      setBest((prevBest) => {
        if (finalScore > prevBest.score) {
          const next = { score: finalScore, round: roundsCleared };
          localStorage.setItem(BEST_KEY, JSON.stringify(next));
          setIsNewBest(true);
          return next;
        }
        return prevBest;
      });
      return finalScore;
    });
    saveGameSession(roundsCleared);
  };

  const handleSelect = (index) => {
    if (phase !== "playing" || lockedRef.current) return;

    if (index === oddIndex) {
      lockedRef.current = true;
      setCheer(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      setPhase("correct");
      setScore((s) => s + 10 * gridSize);
      advanceRef.current = setTimeout(() => {
        setRound((r) => {
          const next = r + 1;
          setPeakRound(next);
          startRound(next);
          return next;
        });
      }, 650);
    } else {
      lockedRef.current = true;
      setWrongIndex(index);
      setPhase("wrong");
      advanceRef.current = setTimeout(() => {
        handleGameOver(round - 1);
      }, 900);
    }
  };

  const iconSize = cols <= 3 ? 40 : cols <= 4 ? 32 : 24;
  const gridMaxWidth = cols <= 3 ? 260 : cols <= 4 ? 340 : 420;
  const difficulty = difficultyForRound(round);

  return (
    <div className="max-w-xl mx-auto w-full pb-10">
      <style>{`
        .ooo-cell { transition: all 0.2s ease; }
        .ooo-cell:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.06); }
        .ooo-pop { animation: ooo-pop 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes ooo-pop { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .ooo-shake { animation: ooo-shake 400ms ease; }
        @keyframes ooo-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .ooo-float { animation: ooo-float 3.5s ease-in-out infinite; }
        @keyframes ooo-float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-6px) rotate(6deg); } }
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
              <Shapes size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: T.ink }}>
                Odd One Out
              </h1>
              <p className="text-xs" style={{ color: T.inkSoft }}>
                Visual Attention & Discrimination
              </p>
            </div>
          </div>
          {phase !== "idle" && (
            <div className="text-right leading-tight">
              <div className="flex items-center gap-1.5 justify-end mb-1">
                <Badge tone="primary">Level {round}</Badge>
                <Badge tone={difficulty.tone}>{difficulty.label}</Badge>
              </div>
              <div className="text-xs" style={{ color: T.inkSoft }}>
                {score} pts
              </div>
            </div>
          )}
        </div>

        {phase === "idle" && (
          <div className="text-center py-2 ooo-pop">
            {/* Hero banner with a live static preview */}
            <div
              className="relative overflow-hidden rounded-2xl p-6 mb-6"
              style={{
                background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
              }}
            >
              <Shapes
                className="absolute -right-5 -bottom-6 opacity-10 ooo-float"
                size={130}
                color="#fff"
              />
              <div className="relative z-10 flex flex-col items-center">
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const isOdd = i === 5;
                    return (
                      <span
                        key={i}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          background: "rgba(255,255,255,0.18)",
                          border: "1px solid rgba(255,255,255,0.35)",
                        }}
                      >
                        <Circle
                          size={14}
                          color="#fff"
                          fill={isOdd ? "transparent" : "#fff"}
                          strokeWidth={2}
                        />
                      </span>
                    );
                  })}
                </div>
                <h2 className="text-white font-bold text-lg mb-1">
                  Spot the one that's different
                </h2>
                <p className="text-white/80 text-xs max-w-xs leading-relaxed">
                  Almost every object matches. Find the odd shape or color
                  before the grid grows and the difference gets subtle.
                </p>
              </div>
            </div>

            {/* Mode picker */}
            <div className="flex justify-center gap-2 mb-6">
              {[
                { id: "shape", label: "Shape Mode", icon: Shapes },
                { id: "color", label: "Color Mode", icon: Sparkles },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-full font-medium transition-colors"
                  style={{
                    background: mode === m.id ? T.primary : T.surface,
                    color: mode === m.id ? "#fff" : T.inkSoft,
                    border: `1px solid ${mode === m.id ? T.primary : T.line}`,
                  }}
                >
                  <m.icon size={14} />
                  {m.label}
                </button>
              ))}
            </div>

            {/* 3-step guide */}
            <div className="grid grid-cols-3 gap-2 mb-6 text-left">
              {[
                { icon: Eye, label: "Scan the grid", desc: "Objects look alike" },
                {
                  icon: Shapes,
                  label: "Spot it",
                  desc: "One shape or color differs",
                },
                {
                  icon: Sparkles,
                  label: "Tap it",
                  desc: "Grid grows each round",
                },
              ].map((step, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl"
                  style={{ background: T.canvas }}
                >
                  <step.icon size={16} color={T.primary} className="mb-2" />
                  <div
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: T.ink }}
                  >
                    {step.label}
                  </div>
                  <div
                    className="text-[11px] leading-snug"
                    style={{ color: T.inkSoft }}
                  >
                    {step.desc}
                  </div>
                </div>
              ))}
            </div>

            {best.score > 0 && (
              <div className="flex justify-center gap-2 mb-6">
                <Badge tone="mint">
                  <span className="inline-flex items-center gap-1">
                    <Trophy size={12} /> Best {best.score} pts
                  </span>
                </Badge>
                <Badge tone="primary">Best Round {best.round}</Badge>
              </div>
            )}

            <Button onClick={handleStart} className="px-8 py-3">
              Start Game
            </Button>
          </div>
        )}

        {phase !== "idle" && phase !== "gameOver" && (
          <div className="py-4">
            <p
              className="text-center text-sm mb-2 font-medium"
              style={{ color: T.inkSoft }}
            >
              Round {round} · {gridSize} objects ·{" "}
              {mode === "shape" ? "Shape" : "Color"} mode
            </p>
            <p
              className="text-center text-sm font-medium mb-6 h-5"
              style={{
                color:
                  phase === "correct"
                    ? T.mint
                    : phase === "wrong"
                      ? T.red
                      : T.ink,
              }}
            >
              {phase === "playing" && "Tap the object that's different"}
              {phase === "correct" && `✓ ${cheer}`}
              {phase === "wrong" && "Not quite — here's the one you missed"}
            </p>

            <div
              className="grid gap-2 sm:gap-3 mx-auto ooo-pop"
              style={{
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                maxWidth: gridMaxWidth,
              }}
            >
              {Array.from({ length: gridSize }).map((_, index) => {
                const isOdd = index === oddIndex;
                const isWrongPick = wrongIndex === index;
                const revealCorrect = phase === "wrong" && isOdd;

                let bg = T.canvas;
                let border = T.line;
                if ((phase === "correct" && isOdd) || revealCorrect) {
                  bg = T.mintSoft;
                  border = T.mint;
                }
                if (isWrongPick) {
                  bg = T.redSoft;
                  border = T.red;
                }

                let iconEl;
                if (mode === "shape") {
                  const Icon =
                    SHAPE_ICONS[isOdd ? shapePair.odd : shapePair.base];
                  iconEl = (
                    <Icon size={iconSize} color={T.primaryDark} strokeWidth={2} />
                  );
                } else {
                  const lightness = isOdd
                    ? Math.max(28, 55 - colorTier.shift)
                    : 55;
                  const fill = `hsl(${colorTier.hue}, 65%, ${lightness}%)`;
                  iconEl = (
                    <Circle
                      size={iconSize}
                      color={fill}
                      fill={fill}
                      strokeWidth={1}
                    />
                  );
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelect(index)}
                    disabled={phase !== "playing"}
                    className={`ooo-cell aspect-square rounded-xl flex items-center justify-center ${
                      isWrongPick ? "ooo-shake" : ""
                    } ${phase === "playing" ? "cursor-pointer" : ""}`}
                    style={{ background: bg, border: `2px solid ${border}` }}
                  >
                    {iconEl}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "gameOver" && (
          <div className="py-4 ooo-pop">
            <div className="text-center mb-6">
              <div
                className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                style={{ background: T.redSoft, color: T.red }}
              >
                ✕
              </div>
              <h2 className="text-lg font-bold" style={{ color: T.ink }}>
                Game Complete
              </h2>
              <p className="text-sm mt-1" style={{ color: T.inkSoft }}>
                You reached{" "}
                <strong style={{ color: T.primary }}>
                  Round {peakRound}
                </strong>
              </p>
              {isNewBest && (
                <div className="mt-2">
                  <Badge tone="mint">
                    <span className="inline-flex items-center gap-1">
                      <Trophy size={12} /> New Best!
                    </span>
                  </Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8 max-w-xs mx-auto">
              <div
                className="p-4 rounded-xl text-center"
                style={{ background: T.canvas }}
              >
                <div className="text-xs mb-1" style={{ color: T.inkSoft }}>
                  Score
                </div>
                <div className="font-bold text-lg" style={{ color: T.ink }}>
                  {score}
                </div>
              </div>
              <div
                className="p-4 rounded-xl text-center"
                style={{ background: T.canvas }}
              >
                <div className="text-xs mb-1" style={{ color: T.inkSoft }}>
                  Rounds Cleared
                </div>
                <div className="font-bold text-lg" style={{ color: T.ink }}>
                  {Math.max(0, peakRound - 1)}
                </div>
              </div>
            </div>

            <div
              className="text-center pt-6 border-t"
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
