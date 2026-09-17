import { API_BASE_URL } from "@/models/apiModel.js";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { T } from "@/models/constant.js";

export function SequenceGame({ onBack }) {
  const navigate = useNavigate();

  const [level, setLevel] = useState(1); // Starts at Level 1
  const [board, setBoard] = useState([]);
  const [isMasked, setIsMasked] = useState(false);
  const [targetNum, setTargetNum] = useState(1);
  const [processing, setProcessing] = useState(false);

  // State variables for the game over screen
  const [attempt, setAttempt] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [finalStats, setFinalStats] = useState(null);

  // Level 1 starts with 4 squares. Level 9 will have 12 squares.
  const squaresCount = level + 3;

  // Generate a new spatial board when the level or attempt increases
  useEffect(() => {
    const positions = [];
    while (positions.length < squaresCount) {
      const randomSquare = Math.floor(Math.random() * 25);
      if (!positions.includes(randomSquare)) {
        positions.push(randomSquare);
      }
    }
    setBoard(positions);
    setIsMasked(false);
    setTargetNum(1);
    setProcessing(false);

    // Give the patient 3 seconds to memorize before masking the numbers
    const timer = setTimeout(() => {
      setIsMasked(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [level, attempt, squaresCount]);

  const handleRestart = () => {
    setLevel(1);
    setIsGameOver(false);
    setFinalStats(null);
    setAttempt((a) => a + 1);
  };

  // Network request to save the payload to MongoDB using authenticated user token
  const saveGameData = async (survivedLevels) => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const token = localStorage.getItem("token") || user.token;
    const patientId = user.id || user._id || "demo-patient-123";

    // Keep payload structure intact so the backend schema doesn't crash,
    // even though we aren't tracking mistakes on the frontend anymore.
    const payload = {
      patientId: patientId,
      gameType: "sequence",
      levelReached: survivedLevels,
      mistakesMade: 0,
      accuracyScore: Math.max(0, Math.round((survivedLevels / 9) * 100)),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/games/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json`,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Failed to save game data.");
      }
    } catch (error) {
      console.error("Database save failed:", error);
    }
  };

  // Triggered on wrong tap (sudden death) or beating max level
  const handleGameOver = async (survivedLevels) => {
    setProcessing(true);

    // Save to MongoDB first
    await saveGameData(survivedLevels);

    // Trap the screen in the Game Over state
    setFinalStats({
      survived: survivedLevels,
    });
    setIsGameOver(true);
  };

  const handleTap = async (index) => {
    if (!isMasked || processing) return;

    const isTarget = board.includes(index);
    const clickedNum = board.indexOf(index) + 1;

    // Clicked an empty background square - Instant Game Over
    if (!isTarget) {
      await handleGameOver(level - 1);
      return;
    }

    // Clicked a square they already successfully cleared
    if (clickedNum < targetNum) return;

    // Clicked the correct next number in the sequence
    if (clickedNum === targetNum) {
      if (targetNum === squaresCount) {
        if (level >= 9) {
          // Beat the final level
          await handleGameOver(level);
        } else {
          setLevel((l) => l + 1); // Move to next level, triggers useEffect
        }
      } else {
        setTargetNum((t) => t + 1); // Stay on level, wait for next click
      }
    } else {
      // Clicked a valid active square, but out of order - Instant Game Over
      await handleGameOver(level - 1);
    }
  };

  // ------------------------------------------------------------------
  // UI RENDER: GAME OVER SCREEN
  // ------------------------------------------------------------------
  if (isGameOver && finalStats) {
    return (
      <div className="max-w-md mx-auto w-full text-center py-10">
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: T.primaryDark }}
        >
          {finalStats.survived >= 9 ? "Perfect Score!" : "Sequence Complete"}
        </h2>
        <p className="mb-8" style={{ color: T.inkSoft }}>
          Here is how you performed:
        </p>

        <div className="flex flex-col gap-4 mb-8">
          <div
            className="p-4 rounded-xl flex justify-between"
            style={{ background: T.surface, border: `1px solid ${T.line}` }}
          >
            <span style={{ color: T.inkSoft }}>Levels Survived</span>
            <span className="font-bold text-xl" style={{ color: T.ink }}>
              {finalStats.survived}
            </span>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: T.line, color: T.ink }}
          >
            Back to Games
          </button>
          <button
            onClick={handleRestart}
            className="flex-1 py-3 rounded-xl font-medium transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: T.line, color: T.ink }}
          >
            Restart Game
          </button>
          <button
            onClick={() => navigate("/patient/history")}
            className="flex-1 py-3 rounded-xl font-medium transition-opacity hover:opacity-80 cursor-pointer"
            style={{ background: T.primary, color: T.surface }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // UI RENDER: ACTIVE GAME GRID
  // ------------------------------------------------------------------
  return (
    <div className="max-w-md mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
          style={{ color: T.inkSoft }}
        >
          <ChevronLeft size={16} />
          Back to Games
        </button>
        <span className="text-sm font-medium" style={{ color: T.inkSoft }}>
          Level {level} / 9
        </span>
      </div>

      <div className="h-1.5 rounded-full mb-8" style={{ background: T.line }}>
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${(level / 9) * 100}%`,
            background: T.primary,
          }}
        />
      </div>

      <p className="text-sm text-center mb-6 h-5" style={{ color: T.inkSoft }}>
        {!isMasked
          ? "Memorize the numbers..."
          : `Tap the boxes in order (1 to ${squaresCount})`}
      </p>

      {/* 5x5 Grid Layout */}
      <div className="grid grid-cols-5 gap-2 aspect-square">
        {Array.from({ length: 25 }).map((_, index) => {
          const isTarget = board.includes(index);
          const numValue = board.indexOf(index) + 1;
          const isCleared = numValue < targetNum;

          let bg = T.surface;
          let border = `1px solid ${T.line}`;
          let content = "";

          // Active Square Rendering Logic
          if (isTarget && !isCleared) {
            bg = T.primarySoft;
            border = `1px solid ${T.primary}`;
            content = !isMasked ? numValue : ""; // Hide number if masked
          } else if (isTarget && isCleared) {
            // Make the square disappear once clicked correctly
            bg = "transparent";
            border = "1px solid transparent";
          }

          return (
            <button
              key={index}
              onClick={() => handleTap(index)}
              disabled={processing || !isMasked || (isTarget && isCleared)}
              className="rounded-xl font-bold text-xl flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: bg,
                border: border,
                color: T.primaryDark,
              }}
            >
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}
