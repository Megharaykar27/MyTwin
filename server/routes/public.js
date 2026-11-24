// Public data: the profile page and "Leave a message"
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { one, run } from "../lib/db.js";
import { HttpError, wrap } from "../lib/http.js";
import { getProfile, listProjects } from "../lib/knowledge.js";
import { geminiOn } from "../providers/gemini.js";

const r = Router();

r.get("/public/profile", (_req, res) => {
  const p = getProfile();
  if (p.show_email === false) delete p.email;
  res.json({ accent: "#7C5CFF", ai_name: "Miu", ...p, projects: listProjects(), ai: geminiOn ? "gemini" : "basic", has_owner: !!one("SELECT 1 FROM owners LIMIT 1") });
});

const leadLimit = rateLimit({
  windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
  handler: (_q, res) => res.status(429).json({ message: "You've sent several messages. Please try again in an hour." }),
});

r.post("/leads", leadLimit, wrap(async (req, res) => {
  const t = (v, max) => String(v || "").trim().slice(0, max);
  const b = req.body || {};
  const name = t(b.name, 80), email = t(b.email, 120), company = t(b.company, 80), message = t(b.message, 2000);
  if (!name) throw new HttpError(400, "Please add your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, "Please add a valid email address.");
  if (!message) throw new HttpError(400, "Please write a message.");
  const conv = b.conv_id ? one("SELECT id FROM conversations WHERE id = ?", String(b.conv_id)) : null;
  const id = nanoid(12);
  run("INSERT INTO leads (id, conv_id, name, email, company, message) VALUES (?, ?, ?, ?, ?, ?)", id, conv?.id || null, name, email, company || null, message);
  res.status(201).json({ id });
}));

export default r;
