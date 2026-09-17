import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ListOrdered, Eye, Timer, Trophy } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Button, Badge } from "@/views/components/common/Primitive.jsx";

// ---- Difficulty curve -------------------------------------------------
// Round 1-2: 3 numbers, 3.0s view time. Every 2 rounds we add a number
// (capped at 7), and view time shrinks by 200ms per round (floored at 1s).
const MIN_COUNT = 3;
const MAX_COUNT = 7;
const START_VIEW_MS = 3000;
const MIN_VIEW_MS = 1000;
const VIEW_DECAY_MS = 200;
const NUMBER_POOL_MAX = 30;
const BEST_KEY = "neuronest_numberOrder_best";

const ENCOURAGEMENTS = [
  "Nice!",
  "Sharp memory!",
  "Great sequencing!",
  "Well spotted!",
  "Excellent!",
];

function countForRound(round) {
  return Math.min(MAX_COUNT, MIN_COUNT + Math.floor((round - 1) / 2));
}
function viewMsForRound(round) {
  return Math.max(MIN_VIEW_MS, START_VIEW_MS - (round - 1) * VIEW_DECAY_MS);
}
function difficultyForRound(round) {
  const count = countForRound(round);
  if (count <= 3) return { label: "Easy", tone: "mint" };
  if (count <= 5) return { label: "Medium", tone: "amber" };
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Picks `count` unique numbers and returns them already shuffled into the
// order they'll be displayed in (their *positions*), independent of value.
function generateBoard(round) {
  const count = countForRound(round);
  const pool = shuffle(
    Array.from({ length: NUMBER_POOL_MAX }, (_, i) => i + 1),
  );
  const numbers = pool.slice(0, count);
  const order = shuffle(numbers);
  const ascending = [...numbers].sort((a, b) => a - b);
  return { count, order, ascending, viewMs: viewMsForRound(round) };
}

// ---- Component ----------------------------------------------------------
export function NumberOrderGame({ onBack }) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [peakRound, setPeakRound] = useState(1);
  const [phase, setPhase] = useState("idle"); // idle | showing | playing | cleared | wrong | gameOver
  const [board, setBoard] = useState(null); // { count, order, ascending, viewMs }
  const [clearedCount, setClearedCount] = useState(0);
  const [wrongIndex, setWrongIndex] = useState(null);
  const [gameStartTime, setGameStartTime] = useState(null);
  const [best, setBest] = useState(loadBest);
  const [isNewBest, setIsNewBest] = useState(false);
  const [cheer, setCheer] = useState(ENCOURAGEMENTS[0]);

  const timeoutRef = useRef(null);
  const advanceRef = useRef(null);
  const lockedRef = useRef(false); // guards against rapid double-taps

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (advanceRef.current) clearTimeout(advanceRef.current);
  };
  useEffect(() => clearTimers, []);

  const startRound = useCallback((r) => {
    clearTimers();
    lockedRef.current = false;
    const nextBoard = generateBoard(r);
    setBoard(nextBoard);
    setClearedCount(0);
    setWrongIndex(null);
    setPhase("showing");

    timeoutRef.current = setTimeout(() => {
      setPhase("playing");
    }, nextBoard.viewMs);
  }, []);

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
    const accuracyScore = Math.min(
      100,
      Math.round(50 + roundsCleared * 5),
    );

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const token = localStorage.getItem("token") || user.token;
      const patientId = user._id || user.id;

      const response = await fetch("http://localhost:5001/api/games/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          gameType: "Number Order",
          levelReached: roundsCleared,
          level: roundsCleared,
          score,
          accuracyScore,
          mistakesMade: 1,
          duration: durationSec,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }
    } catch (err) {
      console.error("Failed to save Number Order session:", err.message);
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

  const handleTap = (index) => {
    if (phase !== "playing" || lockedRef.current || !board) return;

    const value = board.order[index];
    const targetValue = board.ascending[clearedCount];

    if (value === targetValue) {
      const nextClearedCount = clearedCount + 1;
      setClearedCount(nextClearedCount);

      if (nextClearedCount === board.count) {
        // Round fully cleared
        lockedRef.current = true;
        setCheer(
          ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)],
        );
        setPhase("cleared");
        const roundScore = board.count * 20;
        setScore((s) => s + roundScore);
        advanceRef.current = setTimeout(() => {
          setRound((r) => {
            const next = r + 1;
            setPeakRound(next);
            startRound(next);
            return next;
          });
        }, 700);
      }
      // else: stay in "playing", wait for next correct tap
    } else {
      // Wrong tile, or a valid number tapped out of order
      lockedRef.current = true;
      setWrongIndex(index);
      setPhase("wrong");
      advanceRef.current = setTimeout(() => {
        handleGameOver(round - 1);
      }, 800);
    }
  };

  const difficulty = difficultyForRound(round);

  return (
    <div className="max-w-xl mx-auto w-full pb-10">
      <style>{`
        .nog-bar-fill { animation: nog-shrink linear forwards; }
        @keyframes nog-shrink { from { width: 100%; } to { width: 0%; } }
        .nog-cell { transition: all 0.2s ease; }
        .nog-cell:not(:disabled):hover { transform: translateY(-2px); box-shadow: 0 4px 10px rgba(0,0,0,0.06); }
        .nog-pop { animation: nog-pop 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes nog-pop { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .nog-shake { animation: nog-shake 400ms ease; }
        @keyframes nog-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
        .nog-float { animation: nog-float 3.5s ease-in-out infinite; }
        @keyframes nog-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
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
              <ListOrdered size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: T.ink }}>
                Number Order
              </h1>
              <p className="text-xs" style={{ color: T.inkSoft }}>
                Memory & Sequencing
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
          <div className="text-center py-2 nog-pop">
            {/* Hero banner */}
            <div
              className="relative overflow-hidden rounded-2xl p-6 mb-6"
              style={{
                background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
              }}
            >
              <ListOrdered
                className="absolute -right-5 -bottom-6 opacity-10 nog-float"
                size={130}
                color="#fff"
              />
              <div className="relative z-10 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-4">
                  {[4, 2, 7].map((n, i) => (
                    <span
                      key={i}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        border: "1px solid rgba(255,255,255,0.35)",
                      }}
                    >
                      {n}
                    </span>
                  ))}
                </div>
                <h2 className="text-white font-bold text-lg mb-1">
                  Remember the numbers, tap them in order
                </h2>
                <p className="text-white/80 text-xs max-w-xs leading-relaxed">
                  Blocks flash their numbers, then hide. Tap smallest to
                  largest using memory alone — the challenge grows each
                  round.
                </p>
              </div>
            </div>

            {/* 3-step guide */}
            <div className="grid grid-cols-3 gap-2 mb-6 text-left">
              {[
                { icon: Eye, label: "Memorize", desc: "Numbers flash briefly" },
                { icon: Timer, label: "They hide", desc: "Positions stay put" },
                {
                  icon: ListOrdered,
                  label: "Tap in order",
                  desc: "Smallest to largest",
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

            <Button onClick={handleStart} className="px-8 py-3 text-base">
              Start Game
            </Button>
          </div>
        )}

        {phase !== "idle" && phase !== "gameOver" && board && (
          <div className="py-4">
            <p
              className="text-center text-sm mb-2 font-medium"
              style={{ color: T.inkSoft }}
            >
              Round {round} · {board.count} numbers
            </p>
            <p
              className="text-center text-sm font-medium mb-6 h-5"
              style={{
                color:
                  phase === "cleared"
                    ? T.mint
                    : phase === "wrong"
                      ? T.red
                      : T.ink,
              }}
            >
              {phase === "showing" && "Memorize the numbers..."}
              {phase === "playing" &&
                "Tap the blocks in order, smallest to largest"}
              {phase === "cleared" && `✓ ${cheer}`}
              {phase === "wrong" && "Not quite — that wasn't next in order"}
            </p>

            {phase === "showing" && (
              <div
                className="h-1.5 rounded-full overflow-hidden mb-6 max-w-xs mx-auto"
                style={{ background: T.line }}
              >
                <div
                  key={round}
                  className="h-full rounded-full nog-bar-fill"
                  style={{
                    background: T.primary,
                    animationDuration: `${board.viewMs}ms`,
                  }}
                />
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-3 nog-pop">
              {board.order.map((value, index) => {
                const isCleared =
                  board.ascending.indexOf(value) < clearedCount;
                const isWrong = wrongIndex === index;
                const showNumber = phase === "showing" || isCleared;

                let bg = T.canvas;
                let border = T.line;
                let color = T.ink;
                if (isCleared) {
                  bg = T.mintSoft;
                  border = T.mint;
                  color = T.mint;
                }
                if (isWrong) {
                  bg = T.redSoft;
                  border = T.red;
                  color = T.red;
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleTap(index)}
                    disabled={phase !== "playing" || isCleared}
                    className={`nog-cell w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-bold ${
                      isWrong ? "nog-shake" : ""
                    } ${phase === "playing" && !isCleared ? "cursor-pointer" : ""}`}
                    style={{
                      background: bg,
                      border: `2px solid ${border}`,
                      color,
                    }}
                  >
                    {showNumber ? value : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {phase === "gameOver" && board && (
          <div className="py-4 nog-pop">
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
