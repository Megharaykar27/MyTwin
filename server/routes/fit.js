// Job-fit check
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { checkFit } from "../lib/fit.js";
import { HttpError, wrap } from "../lib/http.js";

const r = Router();
const limit = rateLimit({
  windowMs: 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  handler: (_q, res) => res.status(429).json({ message: "You're checking very fast. Please wait a moment." }),
});

r.post("/", limit, wrap(async (req, res) => {
  const jd = String(req.body?.jd || "").trim();
  if (jd.length < 50) throw new HttpError(400, "Please paste a longer job description (at least 50 characters).");
  if (jd.length > 8000) throw new HttpError(400, "That job description is too long (max 8000 characters).");
  res.json(await checkFit(jd));
}));

export default r;
