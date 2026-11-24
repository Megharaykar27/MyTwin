// Job-fit check: compares the skills in a job description with the owner's skills. Plain rules, so the score is explainable.
import { nanoid } from "nanoid";
import { all, run } from "./db.js";
import { getProfile, listProjects } from "./knowledge.js";
import { sentences } from "./text.js";
import { extractSkills, relatedTo } from "./skills.js";
import { explainGeminiError, geminiOn, generate } from "../providers/gemini.js";

// Everything the owner can do, from the profile, the resume and the project pages
export function mySkills() {
  const p = getProfile();
  const docs = all("SELECT body FROM docs WHERE source IN ('resume', 'github')").map((d) => d.body);
  return extractSkills([(p.skills || []).join(", "), ...docs].join("\n\n"));
}

const REQUIRED = /^\W*(requirements?|required|must[- ]haves?|you have|what you (have|bring|need)|qualifications?|minimum qualifications?|(key |technical |core |required )?skills)\b|\bmust\b|\b(requirements?|qualifications?|skills)\s*:/i;
const NICE = /nice[- ]to[- ]haves?|good[- ]to[- ]haves?|preferred( skills| qualifications?)?|bonus( points)?|\bplus\s*:/i;
const NICE_END = /\b(preferred|a (big |huge )?plus|an added advantage|a bonus)\W*$/i; // "Docker is a plus."

// Splits a job description into "required" and "nice to have" text
export function splitJd(jd) {
  let mode = null;
  let sawRequired = false;
  const before = [], required = [], nice = [];
  const add = (text) => (mode === "nice" ? nice : mode === "required" ? required : before).push(text);
  const parts = String(jd).split(/\r?\n|;\s*/).flatMap((l) => sentences(l));
  for (const part of parts) {
    if (NICE_END.test(part) && !/^\W*(preferred|bonus)\W*$/i.test(part)) { nice.push(part); continue; }
    const m = part.match(NICE);
    if (m) {
      if (part.slice(0, m.index).trim()) add(part.slice(0, m.index));
      mode = "nice";
      add(part.slice(m.index + m[0].length));
      continue;
    }
    if (REQUIRED.test(part)) { sawRequired = true; mode = "required"; }
    add(part);
  }
  if (!sawRequired) required.unshift(...before); // no "requirements" section: everything else is required
  return { required: required.join("\n"), nice: nice.join("\n") };
}

const verdictFor = (n) => (n >= 75 ? "Strong match" : n >= 55 ? "Good match" : n >= 35 ? "Partial match" : "Stretch role");
const list = (a) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a.at(-1)}`);

function compare(skills, mine) {
  const out = { matched: [], partial: [], missing: [] };
  for (const s of skills) {
    if (mine.has(s)) { out.matched.push(s); continue; }
    const via = relatedTo(s, mine);
    if (via) out.partial.push({ skill: s, via }); else out.missing.push(s);
  }
  out.score = skills.length ? (out.matched.length + 0.5 * out.partial.length) / skills.length : 0;
  return out;
}

export function scoreFit(jd) {
  const mine = mySkills();
  const parts = splitJd(jd);
  let req = [...extractSkills(parts.required)];
  let opt = [...extractSkills(parts.nice)].filter((s) => !req.includes(s));
  if (!req.length) { req = opt; opt = []; }
  const r = compare(req, mine);
  const n = compare(opt, mine);
  const score = Math.round(opt.length ? 75 * r.score + 25 * n.score : 100 * r.score);

  const years = String(jd).match(/(\d{1,2})\s*(?:\+|(?:-|–|to)\s*\d{1,2}\s*\+?)?\s*(?:years?|yrs?)\b/i);
  const asked = years ? Number(years[1]) : 0;
  const experience_note = asked > 0 ? `I'm a fresher (MCA, graduating 2027), so I'd bring project experience rather than ${asked} ${asked === 1 ? "year" : "years"} in a job.` : null;

  // Projects whose tech overlaps most with the matched skills
  const matchedAll = [...r.matched, ...n.matched];
  const projects = listProjects()
    .map((p) => { const tech = extractSkills(p.tech.join(", ")); return { p, n: matchedAll.filter((s) => tech.has(s)).length }; })
    .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 3).map((x) => x.p);

  return {
    score, verdict: verdictFor(score),
    matched: r.matched, partial: [...r.partial, ...n.partial], missing: r.missing,
    nice: { matched: n.matched, missing: n.missing },
    experience_note, projects, required_total: req.length,
  };
}

function plainSummary(f) {
  const learning = [...f.missing, ...f.partial.map((p) => p.skill), ...f.nice.missing].slice(0, 3);
  const summary = f.required_total
    ? [
      `I match ${f.matched.length} of ${f.required_total} required skills${f.matched.length ? `, including ${list(f.matched.slice(0, 3))}` : ""}.`,
      learning.length ? `I'm still learning ${list(learning)}.` : "",
      f.projects.length ? `My closest work is ${list(f.projects.slice(0, 2).map((p) => p.name))}.` : "",
    ].filter(Boolean).join(" ")
    : "I couldn't find specific skills in this job description, so I can't give a fair score. Please paste the part that lists the requirements.";
  const talking_points = [
    f.matched.length ? `I've used ${list(f.matched.slice(0, 4))}.` : null,
    f.projects[0] ? `${f.projects[0].name}: ${f.projects[0].tagline || "one of my projects"}.` : null,
    f.partial[0] ? `I know ${f.partial[0].via}, which is close to ${f.partial[0].skill}.` : "I learn quickly by building things.",
  ].filter(Boolean);
  return { summary, talking_points };
}

async function writtenSummary(f) {
  const p = getProfile();
  const { text } = await generate({
    contents: [{ role: "user", parts: [{ text: `Job-fit result for ${p.name} (MCA student and fresher):
Score ${f.score}/100 (${f.verdict}). Required skills matched: ${f.matched.join(", ") || "none"}. Partial: ${f.partial.map((x) => `${x.skill} (knows ${x.via})`).join(", ") || "none"}. Missing: ${f.missing.join(", ") || "none"}. Nice-to-have matched: ${f.nice.matched.join(", ") || "none"}; missing: ${f.nice.missing.join(", ") || "none"}. Experience note: ${f.experience_note || "none"}. Closest projects: ${f.projects.map((x) => `${x.name} (${x.tagline || ""})`).join("; ") || "none"}.
Write JSON: {"summary": "3 honest sentences in first person, simple English", "talking_points": ["3 short strings"]}. Use only the lists above. Never invent skills, numbers or experience.` }] }],
    config: { responseMimeType: "application/json", temperature: 0.4 },
  });
  const j = JSON.parse(text);
  if (typeof j.summary !== "string" || !Array.isArray(j.talking_points)) throw new Error("Unexpected summary format");
  return { summary: j.summary, talking_points: j.talking_points.map(String).slice(0, 3) };
}

export async function checkFit(jd) {
  const f = scoreFit(jd);
  let words = plainSummary(f);
  if (geminiOn && f.required_total) {
    try { words = await writtenSummary(f); } catch (e) { console.error("Fit summary:", explainGeminiError(e)); }
  }
  const title = String(jd).split(/\r?\n/).map((l) => l.trim()).find(Boolean)?.slice(0, 80) || "Job description";
  run("INSERT INTO fit_checks (id, title, score) VALUES (?, ?, ?)", nanoid(10), title, f.score);
  return { ...f, ...words };
}
