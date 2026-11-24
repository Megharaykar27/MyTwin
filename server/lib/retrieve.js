// Finds the facts that answer a question (BM25 keyword ranking with synonyms and project detection).
// The knowledge of one person is small, so this is fast, exact and needs no extra AI model.
import { all } from "./db.js";
import { expand, tokens } from "./text.js";

let index = { chunks: [], df: new Map(), avgLen: 1, projects: [] };

export function rebuildIndex() {
  const rows = all(`SELECT c.id, c.heading, c.text, d.id AS doc_id, d.title, d.source, d.url, d.project
                    FROM chunks c JOIN docs d ON d.id = c.doc_id`);
  const df = new Map();
  const chunks = rows.map((r) => {
    const toks = [...tokens(r.heading), ...tokens(r.heading), ...tokens(r.title), ...tokens(r.text)]; // headings count double
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { ...r, tf, len: toks.length };
  });
  const projects = all("SELECT slug, name, aliases FROM projects").map((p) => ({
    slug: p.slug, name: p.name,
    names: [p.name, ...JSON.parse(p.aliases || "[]")].map((n) => n.toLowerCase()),
  }));
  index = { chunks, df, avgLen: chunks.reduce((a, c) => a + c.len, 0) / (chunks.length || 1), projects };
}

// Which projects does the text talk about?
export function mentionedProjects(text) {
  const t = ` ${String(text || "").toLowerCase().replace(/[^a-z0-9+ -]/g, " ")} `;
  return index.projects.filter((p) => p.names.some((n) => t.includes(` ${n.replace(/[^a-z0-9+ -]/g, " ")} `) || t.includes(` ${n.replace(/[^a-z0-9]/g, "")} `))).map((p) => p.slug);
}

export function retrieve(question, { k = 6, history = [] } = {}) {
  const q = tokens(question);
  // short follow-ups ("what tech did it use?") borrow words from the previous question
  const prev = history.filter((m) => m.role === "user").slice(-1)[0]?.text || "";
  const follow = q.length <= 4 && /\b(it|that|this|them|those|its|there|more)\b/i.test(question) ? tokens(prev) : [];
  const terms = expand([...q, ...follow]);
  const projects = [...new Set([...mentionedProjects(question), ...(follow.length ? mentionedProjects(prev) : [])])];
  const N = index.chunks.length || 1;
  const k1 = 1.4, b = 0.7;
  const scored = index.chunks.map((c) => {
    let s = 0;
    for (const t of new Set(terms)) {
      const f = c.tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - index.df.get(t) + 0.5) / (index.df.get(t) + 0.5));
      const weight = q.includes(t) ? 1 : 0.5; // synonyms count half
      s += weight * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.len) / index.avgLen)));
    }
    if (projects.length && projects.includes(c.project)) s = s * 1.6 + 2.5; // asked about a project: its README wins
    // questions about Megha herself (no project named) are answered from her resume first
    if (!projects.length && c.source === "github") s *= 0.6;
    // setup / API / folder details only when someone asks for them
    if (/^(run it locally|project structure|api( overview)?|environment variables|credits|credits and licences|tests|privacy|data)$/i.test(c.heading) && !/\b(run|install|setup|api|endpoint|folder|structure|test|licen[cs]e|credit|privacy|dataset|data)\b/i.test(question)) s *= 0.35;
    if (c.source === "qa") s *= 1.25; // answers the owner wrote by hand are the most precise
    if (c.source === "resume") s *= 1.1;
    return { c, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);

  // at most 3 chunks from one document, so one long README can't crowd out the resume
  const perDoc = new Map();
  const top = [];
  for (const x of scored) {
    const n = perDoc.get(x.c.doc_id) || 0;
    if (n >= 3) continue;
    perDoc.set(x.c.doc_id, n + 1);
    top.push(x);
    if (top.length >= k) break;
  }
  return {
    projects,
    best: top[0]?.s || 0,
    hits: top.map(({ c, s }) => ({ id: c.id, doc_id: c.doc_id, title: c.title, heading: c.heading, text: c.text, source: c.source, url: c.url, project: c.project, score: Math.round(s * 100) / 100 })),
  };
}
