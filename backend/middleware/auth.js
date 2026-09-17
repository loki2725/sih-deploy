import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select("role tokenVersion");

    if (!user) {
      return res.status(401).json({ error: "Account no longer exists." });
    }

    if ((user.tokenVersion || 0) !== (payload.tokenVersion || 0)) {
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    req.user = {
      id: user._id.toString(),
      role: user.role,
      tokenVersion: user.tokenVersion || 0,
    };
    next();
  } catch (_error) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: "You are not authorized for this action." });
  }

  next();
};
