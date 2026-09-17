import { GameSession } from "../models/GameSession.js";
import { User } from "../models/User.js";

export const logGame = async (req, res, next) => {
  try {
    const sessionData = new GameSession({ ...req.body, patientId: req.user.id });
    const savedSession = await sessionData.save();
    res.status(201).json(savedSession);
  } catch (error) {
    next(error);
  }
};

export const getGameHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const isSelf = req.user.id === patientId;

    let isAuthorized = isSelf;
    if (!isAuthorized && req.user.role === "doctor") {
      const doctor = await User.findById(req.user.id).select("linkedPatients");
      isAuthorized = (doctor?.linkedPatients || []).some(
        (id) => id.toString() === patientId,
      );
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "You are not authorized to view this history." });
    }

    const history = await GameSession.find({ patientId }).sort({ playedAt: -1 });
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};
