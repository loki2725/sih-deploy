import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, Volume2 } from "lucide-react";
import { T } from "@/models/constant.js";
import { Card, Button, Badge } from "@/views/components/common/Primitive.jsx";

// ---- SOUND DATA ---------------------------------------------------------
const SOUND_LIBRARY = [
  {
    id: "doorbell",
    name: "Doorbell",
    emoji: "🔔",
    synth: { kind: "tone", type: "triangle", freqs: [659, 784], duration: 420 },
  },
  {
    id: "carHorn",
    name: "Car Horn",
    emoji: "🚗",
    synth: { kind: "tone", type: "sawtooth", freqs: [220], duration: 480 },
  },
  {
    id: "dogBark",
    name: "Dog Bark",
    emoji: "🐕",
    synth: {
      kind: "pulses",
      type: "square",
      freq: 190,
      count: 2,
      duration: 400,
    },
  },
  {
    id: "phoneNotification",
    name: "Phone Notification",
    emoji: "📱",
    synth: {
      kind: "pulses",
      type: "sine",
      freq: 1046,
      count: 2,
      duration: 360,
    },
  },
  {
    id: "alarmClock",
    name: "Alarm Clock",
    emoji: "⏰",
    synth: {
      kind: "pulses",
      type: "square",
      freq: 1500,
      count: 4,
      duration: 460,
    },
  },
  {
    id: "microwaveBeep",
    name: "Microwave Beep",
    emoji: "⏲️",
    synth: { kind: "tone", type: "sine", freqs: [1500], duration: 260 },
  },
  {
    id: "keyboardTyping",
    name: "Keyboard Typing",
    emoji: "⌨️",
    synth: {
      kind: "pulses",
      type: "square",
      freq: 3000,
      count: 3,
      duration: 300,
    },
  },
  {
    id: "waterRunning",
    name: "Water Running",
    emoji: "🚰",
    synth: { kind: "noise", filter: "lowpass", filterFreq: 900, duration: 560 },
  },
  {
    id: "footsteps",
    name: "Footsteps",
    emoji: "👣",
    synth: { kind: "thumps", freq: 90, count: 2, duration: 460 },
  },
  {
    id: "doorOpening",
    name: "Door Opening",
    emoji: "🚪",
    synth: { kind: "sweep", type: "sine", from: 280, to: 480, duration: 460 },
  },
  {
    id: "glassBreaking",
    name: "Glass Breaking",
    emoji: "💥",
    synth: {
      kind: "noise",
      filter: "highpass",
      filterFreq: 3500,
      duration: 340,
      sharp: true,
    },
  },
  {
    id: "clockTicking",
    name: "Clock Ticking",
    emoji: "🕰️",
    synth: {
      kind: "pulses",
      type: "square",
      freq: 2400,
      count: 2,
      duration: 340,
    },
  },
  {
    id: "birdChirping",
    name: "Bird Chirping",
    emoji: "🐦",
    synth: {
      kind: "sweep",
      type: "sine",
      from: 1200,
      to: 2200,
      duration: 260,
      repeat: 2,
    },
  },
  {
    id: "rain",
    name: "Rain",
    emoji: "🌧️",
    synth: {
      kind: "noise",
      filter: "highpass",
      filterFreq: 1800,
      duration: 560,
      gain: 0.14,
    },
  },
  {
    id: "traffic",
    name: "Traffic",
    emoji: "🚦",
    synth: {
      kind: "noise",
      filter: "lowpass",
      filterFreq: 260,
      duration: 560,
      gain: 0.16,
    },
  },
];
const SOUND_MAP = Object.fromEntries(SOUND_LIBRARY.map((s) => [s.id, s]));

// ---- SOUND ENGINE ---------------------------------------------------------
function createNoiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function envelope(ctx, gainNode, peak, duration, sharp) {
  const now = ctx.currentTime;
  const attack = sharp ? 0.005 : 0.02;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(peak, now + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration / 1000);
}

function playSynth(ctx, master, synth) {
  const { kind, duration } = synth;
  const now = ctx.currentTime;

  if (kind === "tone") {
    const step = duration / synth.freqs.length / 1000;
    synth.freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = synth.type;
      osc.frequency.value = f;
      osc.connect(gain).connect(master);
      const t = now + i * step;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step);
      osc.start(t);
      osc.stop(t + step);
    });
  } else if (kind === "pulses") {
    const step = duration / synth.count / 1000;
    for (let i = 0; i < synth.count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = synth.type;
      osc.frequency.value = synth.freq;
      osc.connect(gain).connect(master);
      const t = now + i * step;
      const on = step * 0.5;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, t + on);
      osc.start(t);
      osc.stop(t + on);
    }
  } else if (kind === "thumps") {
    const step = duration / synth.count / 1000;
    for (let i = 0; i < synth.count; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = synth.freq;
      osc.connect(gain).connect(master);
      const t = now + i * step;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.start(t);
      osc.stop(t + 0.18);
    }
  } else if (kind === "sweep") {
    const reps = synth.repeat || 1;
    const step = duration / reps / 1000;
    for (let i = 0; i < reps; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = synth.type;
      osc.connect(gain).connect(master);
      const t = now + i * step;
      osc.frequency.setValueAtTime(synth.from, t);
      osc.frequency.linearRampToValueAtTime(synth.to, t + step * 0.85);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + step);
      osc.start(t);
      osc.stop(t + step);
    }
  } else if (kind === "noise") {
    const src = ctx.createBufferSource();
    src.buffer = createNoiseBuffer(ctx, duration / 1000 + 0.05);
    const filter = ctx.createBiquadFilter();
    filter.type = synth.filter;
    filter.frequency.value = synth.filterFreq;
    const gain = ctx.createGain();
    src.connect(filter).connect(gain).connect(master);
    envelope(ctx, gain, synth.gain || 0.22, duration, synth.sharp);
    src.start(now);
    src.stop(now + duration / 1000 + 0.05);
  }
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function playSound(ctx, master, soundId) {
  return playSynth(ctx, master, SOUND_MAP[soundId].synth);
}

// ---- GAME LOGIC helpers ---------------------------------------------------------
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sameSeq = (a, b) =>
  a.length === b.length && a.every((v, i) => v === b[i]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function generateSequence(level) {
  const size = Math.min(SOUND_LIBRARY.length, 6 + level);
  const pool = SOUND_LIBRARY.slice(0, size).map((s) => s.id);
  const length = level + 2;

  if (length <= pool.length) return shuffle(pool).slice(0, length);
  const seq = [];
  let last = null;
  for (let i = 0; i < length; i++) {
    const choices = pool.filter((id) => id !== last);
    const pick = choices[Math.floor(Math.random() * choices.length)];
    seq.push(pick);
    last = pick;
  }
  return seq;
}

function generateOptions(correctSeq) {
  const pool = [correctSeq];
  let attempts = 0;
  while (pool.length < 4 && attempts < 300) {
    attempts++;
    const perm = shuffle(correctSeq);
    if (!pool.some((o) => sameSeq(o, perm))) pool.push(perm);
  }
  while (pool.length < 4) {
    const perm = [...correctSeq];
    const i = Math.floor(Math.random() * perm.length);
    const j = (i + 1) % perm.length;
    [perm[i], perm[j]] = [perm[j], perm[i]];
    if (!pool.some((o) => sameSeq(o, perm))) pool.push(perm);
  }
  return shuffle(pool);
}

// ---- MAIN COMPONENT ---------------------------------------------------------
export function SoundSequenceGame({ onBack }) {
  const [mode, setMode] = useState("survival");
  const [started, setStarted] = useState(false);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [sequence, setSequence] = useState([]);
  const [options, setOptions] = useState([]);
  const [phase, setPhase] = useState("idle");
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [muted, setMuted] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);
  const [gameStartTime, setGameStartTime] = useState(null);

  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const cancelledRef = useRef(false);
  const answerStartRef = useRef(0);

  const ensureAudio = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new Ctx();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = muted ? 0 : 1;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    return audioCtxRef.current;
  };

  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = muted ? 0 : 1;
  }, [muted]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  // --- BACKEND INTEGRATION ---
  const saveGameSession = async (finalLevel, finalScore) => {
    const durationSec = Math.max(
      1,
      Math.floor((Date.now() - gameStartTime) / 1000),
    );
    const accuracyScore = Math.min(100, Math.round(50 + finalLevel * 5));
    const avgTimePerLevel = parseFloat((durationSec / finalLevel).toFixed(1));

    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const token = localStorage.getItem("token") || user.token;
      const patientId = user._id || user.id;

      await fetch("http://localhost:5001/api/games/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId,
          gameType: "Sound Sequence",
          levelReached: finalLevel,
          level: finalLevel,
          score: finalScore,
          accuracyScore,
          mistakesMade: 1, // Triggered on failure
          duration: durationSec,
          avgTimePerLevel,
        }),
      });
      console.log("✅ Sound Sequence session saved!");
    } catch (err) {
      console.error("❌ Failed to save session:", err);
    }
  };

  const runRound = useCallback(
    async (lvl, seq) => {
      cancelledRef.current = false;
      setPhase("playing");
      setSelectedIdx(null);
      setPlayingIndex(-1);
      const ctx = ensureAudio();
      const pause = Math.max(250, 700 - (lvl - 1) * 40);

      for (let i = 0; i < seq.length; i++) {
        if (cancelledRef.current) return;
        setPlayingIndex(i);
        await playSound(ctx, masterGainRef.current, seq[i]);
        if (cancelledRef.current) return;
        await sleep(pause);
      }

      if (cancelledRef.current) return;
      setPlayingIndex(-1);
      setOptions(generateOptions(seq));
      answerStartRef.current = Date.now();
      setPhase("answering");
    },
    [muted],
  );

  const startLevel = useCallback(
    (lvl) => {
      const seq = generateSequence(lvl);
      setSequence(seq);
      runRound(lvl, seq);
    },
    [runRound],
  );

  const handleStart = () => {
    ensureAudio();
    setStarted(true);
    setLevel(1);
    setScore(0);
    setGameStartTime(Date.now());
    startLevel(1);
  };

  const handleSelect = (opt, idx) => {
    if (phase !== "answering" || selectedIdx !== null) return;
    setSelectedIdx(idx);

    const correct = sameSeq(opt, sequence);
    if (correct) {
      const elapsed = Date.now() - answerStartRef.current;
      const points =
        Math.round(100 * (1 + (level - 1) * 0.2)) +
        Math.max(0, Math.round(50 - (elapsed / 1000) * 10));
      setLastPoints(points);
      setScore((s) => s + points);
      setPhase("correct");
    } else {
      setPhase("wrong");
      if (mode === "survival") saveGameSession(level, score);
    }
  };

  const currentSoundId = playingIndex >= 0 ? sequence[playingIndex] : null;

  return (
    <div className="max-w-xl mx-auto w-full pb-10">
      <style>{`
        .ss-bar { display:inline-block; width:5px; height:8px; border-radius:3px; background:${T.primary}; opacity:0.35; }
        .ss-bar-anim { animation: ss-wave 900ms ease-in-out infinite; }
        @keyframes ss-wave { 0%,100% { height:8px; opacity:0.35;} 50% { height:44px; opacity:1;} }
        .ss-card { transition: all 120ms ease; }
        .ss-card:not(:disabled):hover { transform: translateY(-2px); border-color: ${T.primary}; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .ss-pop { animation: ss-pop 260ms ease; }
        @keyframes ss-pop { 0% { transform: scale(0.9); opacity:0;} 100% { transform: scale(1); opacity:1;} }
      `}</style>

      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm mb-4 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ color: T.inkSoft }}
      >
        <ChevronLeft size={16} /> Back to Games
      </button>

      <Card className="p-8">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-8 pb-4 border-b"
          style={{ borderColor: T.line }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: T.primarySoft, color: T.primary }}
            >
              <Volume2 size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: T.ink }}>
                Sound Sequence
              </h1>
              <p className="text-xs" style={{ color: T.inkSoft }}>
                Auditory Working Memory
              </p>
            </div>
          </div>
          {started && (
            <div className="flex items-center gap-4">
              <div className="text-right leading-tight">
                <div
                  className="text-sm font-semibold"
                  style={{ color: T.primary }}
                >
                  Level {level}
                </div>
                <div className="text-xs" style={{ color: T.inkSoft }}>
                  {score} pts
                </div>
              </div>
              <button
                onClick={() => setMuted(!muted)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm border"
                style={{
                  background: T.canvas,
                  borderColor: T.line,
                  color: T.ink,
                }}
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
          )}
        </div>

        {/* Idle / Mode Select */}
        {phase === "idle" && (
          <div className="text-center py-6">
            <p
              className="mb-6 max-w-sm mx-auto leading-relaxed"
              style={{ color: T.inkSoft }}
            >
              Listen to a sequence of everyday sounds, then pick the exact
              matching order. Every level adds one more sound.
            </p>
            <div className="flex justify-center gap-2 mb-6">
              {[
                { id: "survival", label: "Survival" },
                { id: "practice", label: "Practice" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className="text-sm px-4 py-2 rounded-full font-medium transition-colors"
                  style={{
                    background: mode === m.id ? T.primary : T.surface,
                    color: mode === m.id ? "#fff" : T.inkSoft,
                    border: `1px solid ${mode === m.id ? T.primary : T.line}`,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <Button onClick={handleStart} className="px-8 py-3">
              Start Assessment
            </Button>
          </div>
        )}

        {/* Playing Sequence */}
        {phase === "playing" && (
          <div className="ss-pop py-8">
            <div className="flex items-end justify-center gap-1.5 h-14 mb-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <span
                  key={i}
                  className={`ss-bar ${true ? "ss-bar-anim" : ""}`}
                  style={{ animationDelay: `${i * 70}ms` }}
                />
              ))}
            </div>
            <p
              className="text-center text-sm font-medium mb-4"
              style={{ color: T.ink }}
            >
              {currentSoundId ? (
                <>
                  Playing:{" "}
                  <strong style={{ color: T.primary }}>
                    {SOUND_MAP[currentSoundId].name}
                  </strong>{" "}
                  {SOUND_MAP[currentSoundId].emoji}
                </>
              ) : (
                "Get ready..."
              )}
            </p>
            <div className="flex justify-center gap-2">
              {Array.from({ length: sequence.length }).map((_, i) => (
                <span
                  key={i}
                  className="rounded-full w-2 h-2 transition-colors"
                  style={{ background: i <= playingIndex ? T.primary : T.line }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Answering / Correct Phase */}
        {(phase === "answering" || phase === "correct") && (
          <div className="py-4">
            <p
              className="text-center font-medium mb-6"
              style={{ color: phase === "correct" ? "#10B981" : T.ink }}
            >
              {phase === "correct"
                ? `✓ Correct! +${lastPoints} pts`
                : "Which sequence did you hear?"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {options.map((opt, idx) => {
                const isSelected = phase === "correct" && idx === selectedIdx;
                return (
                  <button
                    key={idx}
                    disabled={phase !== "answering"}
                    onClick={() => handleSelect(opt, idx)}
                    className="ss-card text-left rounded-xl border p-4 w-full"
                    style={{
                      background: isSelected ? "#ECFDF5" : T.canvas,
                      borderColor: isSelected ? "#10B981" : T.line,
                      cursor: phase === "answering" ? "pointer" : "default",
                    }}
                  >
                    <div
                      className="text-xs mb-2 font-semibold"
                      style={{ color: T.inkSoft }}
                    >
                      Option {String.fromCharCode(65 + idx)}
                    </div>
                    <ol className="space-y-1.5">
                      {opt.map((id, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm"
                          style={{ color: T.ink }}
                        >
                          <span style={{ color: T.inkSoft }}>{i + 1}.</span>
                          <span>
                            {SOUND_MAP[id].emoji} {SOUND_MAP[id].name}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </button>
                );
              })}
            </div>
            {phase === "correct" && (
              <div
                className="text-center mt-6 border-t pt-6"
                style={{ borderColor: T.line }}
              >
                <Button
                  onClick={() => {
                    setLevel((l) => l + 1);
                    startLevel(level + 1);
                  }}
                >
                  Next Level
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Game Over (Wrong) */}
        {phase === "wrong" && (
          <div className="ss-pop py-4">
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
                Final Score:{" "}
                <strong style={{ color: T.primary }}>{score}</strong> · Reached
                Level {level}
              </p>
            </div>
            <p
              className="text-center text-sm font-medium mb-3"
              style={{ color: T.ink }}
            >
              The correct sequence was:
            </p>
            <div
              className="max-w-xs mx-auto p-4 rounded-xl mb-6"
              style={{ background: T.canvas }}
            >
              <ol className="space-y-2">
                {sequence.map((id, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: T.ink }}
                  >
                    <span style={{ color: T.inkSoft, fontWeight: 600 }}>
                      {i + 1}.
                    </span>
                    <span>
                      {SOUND_MAP[id].emoji} {SOUND_MAP[id].name}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div
              className="text-center border-t pt-6"
              style={{ borderColor: T.line }}
            >
              <Button
                onClick={() =>
                  mode === "practice" ? startLevel(level) : handleStart()
                }
              >
                {mode === "practice" ? "Try Again" : "Restart Assessment"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
