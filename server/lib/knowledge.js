// What the twin knows: documents (resume, project READMEs, notes, Q&As) split into searchable chunks,
// plus the profile and the project cards. Includes resume import (PDF/DOCX/TXT) and GitHub sync.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nanoid } from "nanoid";
import { all, one, run, tx } from "./db.js";
import { chunk, redactPhones } from "./text.js";
import { rebuildIndex } from "./retrieve.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const SEED = path.join(here, "..", "seed");

// ---------------------------------------------------------------- profile
export const getProfile = () => JSON.parse(one("SELECT data FROM profile WHERE id = 1")?.data || "{}");
export function saveProfile(p) {
  run("INSERT INTO profile (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data", JSON.stringify(p));
  return p;
}

// ---------------------------------------------------------------- docs
export function putDoc({ id = nanoid(10), source, title, url = null, body, project = null }) {
  const clean = redactPhones(body);
  tx(() => {
    run(`INSERT INTO docs (id, source, title, url, body, project, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET source = excluded.source, title = excluded.title, url = excluded.url, body = excluded.body, project = excluded.project, updated_at = datetime('now')`,
      id, source, title, url, clean, project);
    run("DELETE FROM chunks WHERE doc_id = ?", id);
    const parts = source === "qa" ? [{ heading: title, text: clean }] : chunk(clean, title);
    for (const c of parts) run("INSERT INTO chunks (doc_id, heading, text) VALUES (?, ?, ?)", id, c.heading, c.text);
  });
  rebuildIndex();
  return one("SELECT * FROM docs WHERE id = ?", id);
}

export function deleteDoc(id) {
  run("DELETE FROM docs WHERE id = ?", id);
  rebuildIndex();
}

export const listDocs = () => all(`SELECT d.id, d.source, d.title, d.url, d.project, d.updated_at, length(d.body) AS size,
  (SELECT COUNT(*) FROM chunks c WHERE c.doc_id = d.id) AS chunks FROM docs d ORDER BY CASE d.source WHEN 'resume' THEN 0 WHEN 'github' THEN 1 WHEN 'note' THEN 2 ELSE 3 END, d.updated_at DESC`);

// ---------------------------------------------------------------- projects
const parseProject = (p) => p && { ...p, tech: JSON.parse(p.tech || "[]"), aliases: JSON.parse(p.aliases || "[]"), featured: !!p.featured };
export const listProjects = () => all("SELECT * FROM projects ORDER BY featured DESC, sort, name").map(parseProject);
export function upsertProject(p, { keepEdits = false } = {}) {
  const existing = one("SELECT * FROM projects WHERE slug = ?", p.slug);
  if (existing && keepEdits) {
    // a GitHub sync never overwrites what the owner edited by hand, it only fills gaps
    run("UPDATE projects SET tagline = COALESCE(tagline, ?), repo = COALESCE(repo, ?), cover = COALESCE(cover, ?), tech = CASE WHEN tech = '[]' THEN ? ELSE tech END WHERE slug = ?",
      p.tagline || null, p.repo || null, p.cover || null, JSON.stringify(p.tech || []), p.slug);
    return;
  }
  run(`INSERT INTO projects (slug, name, tagline, tech, repo, demo, cover, aliases, featured, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(slug) DO UPDATE SET name = excluded.name, tagline = excluded.tagline, tech = excluded.tech, repo = excluded.repo,
       demo = excluded.demo, cover = excluded.cover, aliases = excluded.aliases, featured = excluded.featured, sort = excluded.sort`,
    p.slug, p.name, p.tagline || null, JSON.stringify(p.tech || []), p.repo || null, p.demo || null, p.cover || null,
    JSON.stringify(p.aliases || []), p.featured === false ? 0 : 1, p.sort ?? 0);
}

// ---------------------------------------------------------------- first run: load the seed folder
export function seedIfEmpty() {
  if (!one("SELECT 1 FROM profile WHERE id = 1")) saveProfile(JSON.parse(fs.readFileSync(path.join(SEED, "profile.json"), "utf8")));
  if (one("SELECT COUNT(*) AS n FROM docs").n > 0) return rebuildIndex();
  const projects = JSON.parse(fs.readFileSync(path.join(SEED, "projects.json"), "utf8"));
  projects.forEach((p, i) => upsertProject({ ...p, sort: i }));
  putDoc({ id: "resume", source: "resume", title: "Resume", body: fs.readFileSync(path.join(SEED, "resume.md"), "utf8") });
  for (const p of projects) {
    const f = path.join(SEED, "readmes", `${p.name}.md`);
    if (fs.existsSync(f)) putDoc({ id: `gh-${p.slug}`, source: "github", title: p.name, url: p.repo, project: p.slug, body: fs.readFileSync(f, "utf8") });
  }
}

// ---------------------------------------------------------------- resume import
const SECTION = /^(profile( summary)?|summary|about( me)?|objective|career objective|education|academic (details|qualifications?)|technical skills|skills|key skills|core skills|experience|work experience|internships?( experience)?|professional experience|projects?|academic projects|personal projects|certifications?|certificates|achievements|awards|soft skills|languages( known)?|hobbies|interests|extra.?curricular( activities)?|publications|volunteering|declaration)\s*:?$/i;

export async function resumeText(buffer, mimetype, filename = "") {
  if (/pdf/.test(mimetype) || /\.pdf$/i.test(filename)) {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    return (await extractText(pdf, { mergePages: true })).text;
  }
  if (/wordprocessingml|docx/.test(mimetype) || /\.docx$/i.test(filename)) {
    const mammoth = await import("mammoth");
    return (await mammoth.default.extractRawText({ buffer })).value;
  }
  return buffer.toString("utf8");
}

// Plain resume text -> markdown sections the twin can search
export function resumeToMarkdown(text) {
  const lines = redactPhones(text).replace(/-\n(?=[a-z])/g, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = ["# Resume"];
  let inDeclaration = false;
  for (const [i, l] of lines.entries()) {
    if (SECTION.test(l)) {
      inDeclaration = /declaration/i.test(l);
      if (!inDeclaration) out.push("", `## ${l.replace(/:$/, "")}`);
      continue;
    }
    if (inDeclaration) continue;
    if (i < 3 && out.length === 1) { out.push("", "## Contact", l); continue; } // name / location / links at the top
    out.push(l.replace(/^[•▪●◦·-]\s*/, "- "));
  }
  return out.join("\n");
}

export async function importResume(file) {
  const text = await resumeText(file.buffer, file.mimetype, file.originalname);
  if (!text || text.replace(/\s/g, "").length < 200) {
    const e = new Error("Couldn't read text from that file. If it's a scanned image, export it as a text PDF or DOCX.");
    e.status = 422;
    throw e;
  }
  const md = resumeToMarkdown(text);
  putDoc({ id: "resume", source: "resume", title: "Resume", body: md });
  return { sections: chunk(md, "Resume").map((c) => c.heading), hidden_phones: (md.match(/\[phone hidden\]/g) || []).length };
}

// ---------------------------------------------------------------- GitHub sync (public repos, no token needed)
const GH = process.env.GITHUB_API || "https://api.github.com";
const RAW = process.env.GITHUB_RAW || "https://raw.githubusercontent.com";
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function gh(url) {
  const res = await fetch(url, { headers: { accept: "application/vnd.github+json", "user-agent": "MyTwin" }, signal: AbortSignal.timeout(15000) });
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) { const e = new Error("GitHub's hourly limit for anonymous requests is reached. Try again in an hour."); e.status = 429; throw e; }
  if (!res.ok) { const e = new Error(`GitHub answered ${res.status}.`); e.status = 502; throw e; }
  return res;
}

export async function syncGithub(username, { includeForks = false } = {}) {
  const user = String(username || "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "").trim();
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(user)) { const e = new Error("Enter a GitHub username or profile link."); e.status = 400; throw e; }
  let res;
  try { res = await gh(`${GH}/users/${user}/repos?per_page=100&sort=pushed`); } catch (e) {
    if (e.status) throw e;
    const err = new Error("Couldn't reach GitHub. Check the internet connection."); err.status = 503; throw err;
  }
  if (!res) { const e = new Error(`GitHub user "${user}" not found.`); e.status = 404; throw e; }
  const repos = (await res.json()).filter((r) => (includeForks || !r.fork) && !r.archived && r.name.toLowerCase() !== user.toLowerCase());
  const done = [];
  for (const r of repos) {
    const slug = slugify(r.name);
    let readme = "";
    const rr = await gh(`${RAW}/${user}/${r.name}/${r.default_branch}/README.md`).catch(() => null);
    if (rr) readme = await rr.text();
    const img = readme.match(/!\[[^\]]*\]\(((?!https?:)[^)\s]+\.(?:png|jpe?g|gif|webp))\)/i)?.[1];
    upsertProject({
      slug, name: r.name, tagline: r.description || null, tech: [r.language, ...(r.topics || [])].filter(Boolean).slice(0, 6),
      repo: r.html_url, demo: r.homepage || null, cover: img ? `${RAW}/${user}/${r.name}/${r.default_branch}/${img.replace(/^\.?\//, "")}` : null,
      aliases: [r.name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()], sort: 50,
    }, { keepEdits: true });
    const body = [`# ${r.name}`, r.description || "", `Language: ${r.language || "n/a"}. Topics: ${(r.topics || []).join(", ") || "none"}.`, readme].join("\n\n");
    putDoc({ id: `gh-${slug}`, source: "github", title: r.name, url: r.html_url, project: slug, body });
    done.push(r.name);
  }
  return { user, repos: done };
}
