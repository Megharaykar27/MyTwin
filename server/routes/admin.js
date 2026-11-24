// Owner-only admin API
import { Router } from "express";
import { all, one, run, tx } from "../lib/db.js";
import { HttpError, ownerOnly, resumeUpload, wrap } from "../lib/http.js";
import { deleteDoc, getProfile, importResume, listDocs, listProjects, putDoc, saveProfile, syncGithub } from "../lib/knowledge.js";
import { retrieve } from "../lib/retrieve.js";
import { redactPhones } from "../lib/text.js";
import { answer, cleanInput } from "../lib/twin.js";
import { geminiOn } from "../providers/gemini.js";

const r = Router();
r.use(ownerOnly);

const count = (sql) => one(sql).n;
const norm = (t) => String(t || "").toLowerCase().replace(/\s+/g, " ").replace(/[?!.\s]+$/, "").trim();
const str = (v, max) => String(v ?? "").trim().slice(0, max);

// ---------------------------------------------------------------- overview
r.get("/overview", (_req, res) => {
  const perDay = (table, where = "") => new Map(all(`SELECT date(created_at) AS d, COUNT(*) AS n FROM ${table} WHERE created_at >= date('now', '-13 days') ${where} GROUP BY d`).map((x) => [x.d, x.n]));
  const convs = perDay("conversations"), qs = perDay("messages", "AND role = 'user'");
  const chart = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return { date, conversations: convs.get(date) || 0, questions: qs.get(date) || 0 };
  });
  const companies = new Map();
  for (const { c } of [
    ...all("SELECT json_extract(visitor, '$.company') AS c FROM conversations"),
    ...all("SELECT company AS c FROM leads"),
  ]) if (c?.trim()) companies.set(c.trim(), (companies.get(c.trim()) || 0) + 1);
  res.json({
    totals: {
      conversations: count("SELECT COUNT(*) AS n FROM conversations"),
      questions: count("SELECT COUNT(*) AS n FROM messages WHERE role = 'user'"),
      unread_leads: count("SELECT COUNT(*) AS n FROM leads WHERE read = 0"),
      unanswered: count("SELECT COUNT(*) AS n FROM messages WHERE unanswered = 1 AND resolved = 0"),
      fit_checks: count("SELECT COUNT(*) AS n FROM fit_checks"),
    },
    chart,
    top_questions: all("SELECT lower(trim(text)) AS question, COUNT(*) AS n FROM messages WHERE role = 'user' GROUP BY question ORDER BY n DESC, MAX(created_at) DESC LIMIT 8"),
    companies: [...companies].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 8),
    feedback: { helpful: count("SELECT COUNT(*) AS n FROM messages WHERE feedback = 1"), not_helpful: count("SELECT COUNT(*) AS n FROM messages WHERE feedback = -1") },
    ai: geminiOn ? "gemini" : "basic",
    github_user: process.env.GITHUB_USER || "",
  });
});

// ---------------------------------------------------------------- conversations
r.get("/conversations", (_req, res) => res.json(all(`
  SELECT c.id, c.visitor, c.source, c.created_at, c.last_at,
    (SELECT text FROM messages m WHERE m.conv_id = c.id AND m.role = 'user' ORDER BY m.created_at, m.rowid LIMIT 1) AS first_question,
    (SELECT COUNT(*) FROM messages m WHERE m.conv_id = c.id) AS messages
  FROM conversations c ORDER BY c.last_at DESC, c.rowid DESC LIMIT 200`).map((c) => ({ ...c, visitor: JSON.parse(c.visitor) }))));

r.get("/conversations/:id", wrap(async (req, res) => {
  const c = one("SELECT * FROM conversations WHERE id = ?", req.params.id);
  if (!c) throw new HttpError(404, "Conversation not found.");
  const messages = all("SELECT * FROM messages WHERE conv_id = ? ORDER BY created_at, rowid", c.id)
    .map((m) => ({ ...m, sources: JSON.parse(m.sources), projects: JSON.parse(m.projects), unanswered: !!m.unanswered, resolved: !!m.resolved }));
  res.json({ ...c, visitor: JSON.parse(c.visitor), messages });
}));

r.delete("/conversations/:id", (req, res) => {
  run("DELETE FROM conversations WHERE id = ?", req.params.id);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- questions the twin couldn't answer
const openQuestions = () => all(`
  SELECT m.id, m.conv_id, m.text AS reply, m.created_at, m.engine,
    (SELECT u.text FROM messages u WHERE u.conv_id = m.conv_id AND u.role = 'user' AND u.rowid < m.rowid ORDER BY u.rowid DESC LIMIT 1) AS question
  FROM messages m WHERE m.unanswered = 1 AND m.resolved = 0 ORDER BY m.created_at DESC, m.rowid DESC`);
const openQuestion = (id) => {
  const q = openQuestions().find((x) => x.id === id);
  if (!q) throw new HttpError(404, "That question isn't open any more.");
  return q;
};

r.get("/unanswered", (_req, res) => res.json(openQuestions()));

r.post("/unanswered/:msgId/answer", wrap(async (req, res) => {
  const q = openQuestion(req.params.msgId);
  const body = str(req.body?.answer, 4000);
  if (!body) throw new HttpError(400, "Please write an answer.");
  const doc = putDoc({ source: "qa", title: redactPhones(q.question), body });
  const same = openQuestions().filter((x) => norm(x.question) === norm(q.question));
  for (const x of same) run("UPDATE messages SET resolved = 1 WHERE id = ?", x.id);
  res.status(201).json({ doc, resolved: same.length });
}));

r.post("/unanswered/:msgId/dismiss", wrap(async (req, res) => {
  openQuestion(req.params.msgId);
  run("UPDATE messages SET resolved = 1 WHERE id = ?", req.params.msgId);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------- leads (inbox)
r.get("/leads", (_req, res) => res.json(all("SELECT * FROM leads ORDER BY created_at DESC, rowid DESC").map((l) => ({ ...l, read: !!l.read }))));
r.get("/leads/:id", wrap(async (req, res) => {
  const l = one("SELECT * FROM leads WHERE id = ?", req.params.id);
  if (!l) throw new HttpError(404, "Message not found.");
  res.json({ ...l, read: !!l.read });
}));
r.patch("/leads/:id", wrap(async (req, res) => {
  const done = run("UPDATE leads SET read = ? WHERE id = ?", req.body?.read === false ? 0 : 1, req.params.id);
  if (!done.changes) throw new HttpError(404, "Message not found.");
  res.json({ ok: true });
}));
r.delete("/leads/:id", (req, res) => { run("DELETE FROM leads WHERE id = ?", req.params.id); res.json({ ok: true }); });

// ---------------------------------------------------------------- knowledge
const getDoc = (id) => { const d = one("SELECT * FROM docs WHERE id = ?", id); if (!d) throw new HttpError(404, "Document not found."); return d; };
function noteBody(b) {
  const source = b?.source === "qa" ? "qa" : "note";
  const title = redactPhones(str(b?.title, 200)), body = str(b?.body, 20000);
  if (!title) throw new HttpError(400, source === "qa" ? "Please write the question." : "Please add a title.");
  if (body.length < 2) throw new HttpError(400, source === "qa" ? "Please write the answer." : "Please write the note.");
  if (source === "note" && body.length <= 20) throw new HttpError(400, "Please write a little more (at least 20 characters), so the twin can find it.");
  return { source, title, body };
}

r.get("/knowledge", (_req, res) => res.json(listDocs()));
r.get("/knowledge/:id", wrap(async (req, res) => {
  const d = getDoc(req.params.id);
  res.json({ ...d, chunks: all("SELECT id, heading, text FROM chunks WHERE doc_id = ? ORDER BY id", d.id) });
}));
r.post("/knowledge", wrap(async (req, res) => res.status(201).json(putDoc(noteBody(req.body)))));
r.put("/knowledge/:id", wrap(async (req, res) => {
  const d = getDoc(req.params.id);
  if (!["note", "qa"].includes(d.source)) throw new HttpError(400, "Update the resume by uploading it again, and GitHub pages by syncing.");
  res.json(putDoc({ ...noteBody({ ...req.body, source: d.source }), id: d.id }));
}));
r.delete("/knowledge/:id", wrap(async (req, res) => { getDoc(req.params.id); deleteDoc(req.params.id); res.json({ ok: true }); }));

r.post("/resume", resumeUpload.single("file"), wrap(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Please choose a PDF, DOCX or TXT resume.");
  try {
    res.json(await importResume(req.file));
  } catch (e) {
    if (e.status) throw e;
    console.error(e);
    throw new HttpError(422, "Couldn't read that file. Please export it again as a text PDF or DOCX.");
  }
}));

r.post("/github/sync", wrap(async (req, res) => res.json(await syncGithub(req.body?.username || process.env.GITHUB_USER, { includeForks: !!req.body?.include_forks }))));

// ---------------------------------------------------------------- profile and projects
const url = (v) => {
  const s = str(v, 500);
  if (s && !/^https?:\/\/[^\s]+$/i.test(s)) throw new HttpError(400, `"${s.slice(0, 60)}" isn't a valid link. Links start with https://`);
  return s;
};
const chips = (v, max, len) => [...new Set((Array.isArray(v) ? v : []).map((x) => redactPhones(str(x, len))).filter(Boolean))].slice(0, max);

r.get("/profile", (_req, res) => res.json({ accent: "#7C5CFF", show_email: true, ...getProfile() }));
r.put("/profile", wrap(async (req, res) => {
  const b = req.body || {};
  const p = { ...getProfile() };
  for (const [k, max] of Object.entries({ name: 80, first_name: 40, ai_name: 30, headline: 160, location: 120, availability: 240, intro: 600, tone: 120 })) if (k in b) p[k] = redactPhones(str(b[k], max));
  for (const k of ["linkedin", "github", "portfolio"]) if (k in b) p[k] = url(b[k]);
  if ("email" in b) {
    p.email = str(b.email, 120);
    if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new HttpError(400, "Enter a valid email address.");
  }
  if (!p.ai_name) p.ai_name = "Miu";
  if (!p.name) throw new HttpError(400, "The name can't be empty.");
  if ("skills" in b) p.skills = chips(b.skills, 80, 60);
  if ("hobbies" in b) p.hobbies = chips(b.hobbies, 20, 80);
  if ("suggested" in b) p.suggested = chips(b.suggested, 6, 120);
  if ("accent" in b) p.accent = /^#[0-9a-f]{6}$/i.test(b.accent) ? b.accent : "#7C5CFF";
  if ("show_email" in b) p.show_email = !!b.show_email;
  res.json(saveProfile(p));
}));

r.get("/projects", (_req, res) => res.json(listProjects()));
r.patch("/projects/:slug", wrap(async (req, res) => {
  const b = req.body || {};
  const p = one("SELECT * FROM projects WHERE slug = ?", req.params.slug);
  if (!p) throw new HttpError(404, "Project not found.");
  const next = {
    tagline: "tagline" in b ? redactPhones(str(b.tagline, 200)) || null : p.tagline,
    tech: "tech" in b ? JSON.stringify(chips(b.tech, 12, 40)) : p.tech,
    repo: "repo" in b ? url(b.repo) || null : p.repo,
    demo: "demo" in b ? url(b.demo) || null : p.demo,
    cover: "cover" in b ? url(b.cover) || null : p.cover,
    featured: "featured" in b ? (b.featured ? 1 : 0) : p.featured,
    sort: "sort" in b && Number.isFinite(Number(b.sort)) ? Math.round(Number(b.sort)) : p.sort,
  };
  tx(() => run("UPDATE projects SET tagline = ?, tech = ?, repo = ?, demo = ?, cover = ?, featured = ?, sort = ? WHERE slug = ?", ...Object.values(next), p.slug));
  res.json(listProjects().find((x) => x.slug === p.slug));
}));

// ---------------------------------------------------------------- try a question without saving it
r.post("/test-question", wrap(async (req, res) => {
  const text = cleanInput(req.body?.text);
  if (!text) throw new HttpError(400, "Please type a question.");
  const a = await answer({ question: text, profile: getProfile() });
  const found = retrieve(text, { k: 6 });
  res.json({ ...a, unanswered: !!a.unanswered, best: found.best, hits: found.hits });
}));

export default r;
