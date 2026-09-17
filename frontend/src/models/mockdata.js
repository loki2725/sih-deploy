export const initialPatient = {
  name: "Ramesh Das",
  age: 72,
  language: "English",
  location: "Guwahati, Assam",
  dementia: "Yes",
  memorySymptoms: "Yes",
  chronicCondition: "Yes",
  visualImpairment: "No",
  auditoryImpairment: "No",
  accessibilityMode: "Both",
  connectionCode: "MC-7421-XR",
  linkedDoctor: "Dr. Ananya Saikia",
  medications: [
    { name: "Amlodipine 5mg", time: "9:00 AM", taken: true },
    { name: "Metformin 500mg", time: "2:00 PM", taken: false },
  ],
  conditions: ["Hypertension"],
  pastIssues: "Knee surgery (2019)",
};

export const games = [
  {
    key: "sequence",
    name: "Pattern Memory",
    desc: "Remember the sequence of highlighted squares.",
    difficulty: "Adaptive",
    icon: "🧠",
  },
  {
    key: "color",
    name: "Color Memory",
    desc: "Memorize the sequence of colored dots.",
    difficulty: "Adaptive",
    icon: "🎨",
  },
  {
    key: "sound",
    name: "Sound Sequence", // <-- THIS IS THE NEW ONE
    desc: "Listen to and memorize everyday sounds.",
    difficulty: "Medium",
    icon: "🎵",
  },
  {
    key: "numberOrder",
    name: "Number Order",
    desc: "Memorize hidden numbers and tap them in ascending order.",
    difficulty: "Adaptive",
    icon: "🔢",
  },
  {
    key: "oddOneOut",
    name: "Odd One Out",
    desc: "Spot the one shape or color that doesn't match.",
    difficulty: "Adaptive",
    icon: "🔍",
  },
];

// ... keep your existing performanceHistory array below this!

export const performanceHistory = [
  { date: "May 1", score: 62 },
  { date: "May 8", score: 70 },
  { date: "May 15", score: 58 },
  { date: "May 22", score: 75 },
  { date: "May 29", score: 85 },
];

export const mockPatientsList = [
  {
    name: "Ramesh Das",
    age: 72,
    risk: "amber",
    lastScore: 85,
    condition: "Dementia (Mild)",
  },
  {
    name: "Lalthanpuii",
    age: 68,
    risk: "red",
    lastScore: 54,
    condition: "Missed reminders",
  },
  {
    name: "Anil Chhetri",
    age: 75,
    risk: "red",
    lastScore: 40,
    condition: "No games in 3 days",
  },
  {
    name: "Sunita Rao",
    age: 70,
    risk: "mint",
    lastScore: 91,
    condition: "Stable",
  },
];

export const SEQUENCE_COLORS = [
  { key: "g", color: "#2FBF8F" },
  { key: "p", color: "#6C4FE0" },
  { key: "o", color: "#F0A83B" },
  { key: "b", color: "#3B82F6" },
];
