// The owner's account: first-time setup (once) and login
import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { one, run } from "../lib/db.js";
import { HttpError, ownerOnly, signToken, wrap } from "../lib/http.js";

const r = Router();
const limit = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  handler: (_q, res) => res.status(429).json({ message: "Too many tries. Please wait 15 minutes." }),
});
const hasOwner = () => !!one("SELECT 1 FROM owners LIMIT 1");
const clean = (b) => ({ email: String(b?.email || "").trim().toLowerCase(), password: String(b?.password || "") });

r.get("/status", (_req, res) => res.json({ has_owner: hasOwner() }));

r.post("/setup", limit, wrap(async (req, res) => {
  if (hasOwner()) throw new HttpError(403, "This twin already has an owner.");
  const { email, password } = clean(req.body);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
  if (password.length < 8) throw new HttpError(400, "The password needs at least 8 characters.");
  const owner = { id: nanoid(12), email };
  const hash = await bcrypt.hash(password, 10);
  if (hasOwner()) throw new HttpError(403, "This twin already has an owner."); // someone else finished first
  run("INSERT INTO owners (id, email, password_hash) VALUES (?, ?, ?)", owner.id, email, hash);
  res.status(201).json({ token: signToken(owner) });
}));

r.post("/login", limit, wrap(async (req, res) => {
  const { email, password } = clean(req.body);
  const owner = one("SELECT * FROM owners WHERE email = ?", email);
  if (!owner || !(await bcrypt.compare(password, owner.password_hash))) throw new HttpError(401, "Wrong email or password.");
  res.json({ token: signToken(owner) });
}));

r.get("/me", ownerOnly, (req, res) => res.json({ email: req.owner.email }));

export default r;
