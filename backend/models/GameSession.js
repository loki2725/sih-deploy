import mongoose from "mongoose";

const gameSessionSchema = new mongoose.Schema({
  patientId: { type: String, required: true }, // Will link to specific Patient IDs later
  gameType: { type: String, required: true },
  levelReached: { type: Number, required: true },
  mistakesMade: { type: Number, required: true },
  accuracyScore: { type: Number, required: true },
  playedAt: { type: Date, default: Date.now },
});

export const GameSession = mongoose.model("GameSession", gameSessionSchema);
