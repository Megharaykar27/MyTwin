// Chat with the twin. Answers are streamed with server-sent events (SSE).
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { nanoid } from "nanoid";
import { all, one, run, tx } from "../lib/db.js";
import { HttpError, wrap } from "../lib/http.js";
import { getProfile, listProjects } from "../lib/knowledge.js";
import { answer, cleanInput } from "../lib/twin.js";

const r = Router();
const opts = {
  standardHeaders: true, legacyHeaders: false,
  handler: (_q, res) => res.status(429).json({ message: "You're asking very fast. Please wait a moment." }),
};
const perMinute = rateLimit({ ...opts, windowMs: 60 * 1000, limit: Number(process.env.CHAT_PER_MINUTE) || 20 });
const perDay = rateLimit({ ...opts, windowMs: 24 * 60 * 60 * 1000, limit: 200 });
const startLimit = rateLimit({ ...opts, windowMs: 60 * 1000, limit: 30 });

const getConv = (id) => {
  const c = one("SELECT * FROM conversations WHERE id = ?", id);
  if (!c) throw new HttpError(404, "Conversation not found.");
  return c;
};
const short = (v) => String(v || "").trim().slice(0, 80);

r.post("/", startLimit, wrap(async (req, res) => {
  const v = req.body?.visitor || {};
  const visitor = Object.fromEntries(["name", "company", "role"].map((k) => [k, short(v[k])]).filter(([, x]) => x));
  const id = nanoid(16);
  run("INSERT INTO conversations (id, visitor, source) VALUES (?, ?, ?)", id, JSON.stringify(visitor), req.body?.source === "widget" ? "widget" : "web");
  res.status(201).json({ id });
}));

r.get("/:id", wrap(async (req, res) => {
  const c = getConv(req.params.id);
  const bySlug = new Map(listProjects().map((p) => [p.slug, p]));
  const messages = all("SELECT * FROM messages WHERE conv_id = ? ORDER BY created_at, rowid", c.id).map((m) => ({
    id: m.id, role: m.role, text: m.text, sources: JSON.parse(m.sources),
    projects: JSON.parse(m.projects).map((s) => bySlug.get(s)).filter(Boolean),
    unanswered: !!m.unanswered, feedback: m.feedback, engine: m.engine, created_at: m.created_at,
  }));
  res.json({ id: c.id, visitor: JSON.parse(c.visitor), messages });
}));

r.post("/messages/:msgId/feedback", wrap(async (req, res) => {
  const value = Number(req.body?.value);
  if (![1, -1].includes(value)) throw new HttpError(400, "Feedback must be 1 or -1.");
  const done = run("UPDATE messages SET feedback = ? WHERE id = ? AND role = 'twin'", value, req.params.msgId);
  if (!done.changes) throw new HttpError(404, "Message not found.");
  res.json({ ok: true });
}));

r.post("/:id/messages", perMinute, perDay, wrap(async (req, res) => {
  const c = getConv(req.params.id);
  const raw = String(req.body?.text || "").trim();
  if (!raw) throw new HttpError(400, "Please type a question.");
  if (raw.length > 600) throw new HttpError(400, "Please keep your question under 600 characters.");
  const text = cleanInput(raw);
  const history = all("SELECT role, text FROM messages WHERE conv_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 6", c.id).reverse();

  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
  res.flushHeaders();
  const send = (event, data) => { if (!res.writableEnded && !res.destroyed) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
  const stop = new AbortController();
  res.on("close", () => { if (!res.writableEnded) stop.abort(); }); // the visitor pressed Stop or left

  try {
    send("meta", { sources: [], projects: [] });
    const a = await answer({ question: text, history, profile: getProfile(), onDelta: (t) => send("delta", { text: t }), signal: stop.signal });
    const id = nanoid(12);
    tx(() => {
      run("INSERT INTO messages (id, conv_id, role, text) VALUES (?, ?, 'user', ?)", nanoid(12), c.id, text);
      if (a.text) {
        run("INSERT INTO messages (id, conv_id, role, text, sources, projects, unanswered, engine) VALUES (?, ?, 'twin', ?, ?, ?, ?, ?)",
          id, c.id, a.text, JSON.stringify(a.sources), JSON.stringify(a.projects.map((p) => p.slug)), a.unanswered, a.engine);
      }
      run("UPDATE conversations SET last_at = datetime('now') WHERE id = ?", c.id);
    });
    send("done", { id, text: a.text, sources: a.sources, projects: a.projects, unanswered: !!a.unanswered, engine: a.engine });
  } catch (e) {
    console.error(e);
    send("error", { message: "Something went wrong. Please try again." });
  }
  res.end();
}));

export default r;
