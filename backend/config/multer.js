import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, "..", "uploads", "tmp");

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, TMP_DIR),
  filename: (_req, file, cb) => {
    const randomName = crypto.randomBytes(16).toString("hex");
    const extension = path.extname(file.originalname);
    cb(null, `${randomName}${extension}`);
  },
});

export const uploadRecord = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});
