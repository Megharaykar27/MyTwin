// Shared HTTP helpers: errors, async routes, owner (admin) auth, file uploads.
import jwt from "jsonwebtoken";
import multer from "multer";
import { one } from "./db.js";

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const signToken = (owner) => jwt.sign({ sub: owner.id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// Only the twin's owner can use /api/admin/*
export const ownerOnly = wrap(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Please log in first.");
  let payload;
  try { payload = jwt.verify(header.slice(7), process.env.JWT_SECRET); } catch { throw new HttpError(401, "Your session has expired. Please log in again."); }
  const owner = one("SELECT id, email FROM owners WHERE id = ?", payload.sub);
  if (!owner) throw new HttpError(401, "Account not found.");
  req.owner = owner;
  next();
});

// Resume uploads: PDF, DOCX or TXT, kept in memory and never stored as a file
export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    /pdf|wordprocessingml|text\/plain/.test(file.mimetype) || /\.(pdf|docx|txt)$/i.test(file.originalname)
      ? cb(null, true)
      : cb(new HttpError(400, "Please upload a PDF, DOCX or TXT resume.")),
});
