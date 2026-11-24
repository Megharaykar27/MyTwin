// API tests: the real server, once with a mock Gemini and once with no key. Each run uses its own temporary database.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { startMockGemini } from "./mock-gemini.js";

const SERVER = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const freePort = () => new Promise((ok) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const { port } = s.address(); s.close(() => ok(port)); }); });

async function startServer(env = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mytwin-"));
  const port = await freePort();
  const child = spawn(process.execPath, ["--disable-warning=ExperimentalWarning", "index.js"], {
    cwd: SERVER, stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PORT: String(port), DATABASE_FILE: path.join(dir, "test.db"), JWT_SECRET: "test-secret", CLIENT_URL: "http://localhost:5177", GEMINI_API_KEY: "", GEMINI_MODEL: "", GEMINI_BASE_URL: "", CHAT_PER_MINUTE: "100", ...env },
  });
  let log = "";
  await new Promise((ok, fail) => {
    const seen = (d) => { log += d; if (log.includes("MyTwin API on")) ok(); };
    child.stdout.on("data", seen);
    child.stderr.on("data", seen);
    child.on("exit", (code) => fail(new Error(`server stopped (${code}): ${log}`)));
  });
  const base = `http://127.0.0.1:${port}`;
  const call = async (method, url, body, token) => {
    const form = body instanceof FormData;
    const res = await fetch(base + url, {
      method, body: body === undefined ? undefined : form ? body : JSON.stringify(body),
      headers: { ...(body !== undefined && !form ? { "content-type": "application/json" } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    return { status: res.status, headers: res.headers, data: await res.json().catch(() => null) };
  };
  return {
    base, call, log: () => log,
    stop: async () => {
      const gone = new Promise((ok) => child.once("exit", ok));
      child.removeAllListeners("exit");
      child.once("exit", () => {});
      child.kill();
      await Promise.race([gone, new Promise((ok) => setTimeout(ok, 1500))]);
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    },
  };
}

// Asks one question and collects the streamed events
async function chat(s, question, conv) {
  const id = conv || (await s.call("POST", "/api/chat", { visitor: { name: "Asha", company: "Acme" } })).data.id;
  const res = await fetch(`${s.base}/api/chat/${id}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: question }) });
  if (res.status !== 200) return { status: res.status, conv: id };
  assert.match(res.headers.get("content-type"), /text\/event-stream/);
  const events = (await res.text()).trim().split("\n\n").map((b) => ({ event: b.match(/^event: (.+)$/m)[1], data: JSON.parse(b.match(/^data: (.+)$/m)[1]) }));
  return { status: 200, conv: id, deltas: events.filter((e) => e.event === "delta").map((e) => e.data.text), done: events.find((e) => e.event === "done")?.data };
}

const hasKey = (o, key) => !!o && typeof o === "object" && Object.entries(o).some(([k, v]) => k === key || hasKey(v, key));

describe("with Gemini (mock)", () => {
  let mock, s;
  before(async () => { mock = await startMockGemini(); s = await startServer({ GEMINI_API_KEY: "test-key", GEMINI_BASE_URL: mock.url }); });
  after(async () => { await s?.stop(); await mock?.close(); });

  test("chat streams an answer with a source and a project card", async () => {
    const a = await chat(s, "Tell me about NeuroCheck");
    assert.ok(a.deltas.length >= 2);
    assert.equal(a.deltas.join(""), a.done.text);
    assert.equal(a.done.engine, "gemini-3.8-flash", s.log() + mock.calls.join("\n"));
    assert.ok(a.done.sources.length >= 1);
    assert.ok(a.done.projects.some((p) => p.name === "NeuroCheck"));
    assert.equal(a.done.unanswered, false);
  });

  test("the hidden [NO_ANSWER] token is never shown", async () => {
    const a = await chat(s, "What is the salary of the CEO?");
    assert.equal(a.done.unanswered, true);
    assert.doesNotMatch(a.deltas.join("") + a.done.text, /NO_ANSWER|\[NO/);
    assert.match(a.done.text, /^I don't have that detail/);
  });

  test("job fit uses the written summary", async () => {
    const f = await s.call("POST", "/api/fit", { jd: "Junior Developer\nRequirements: React, Node.js, MongoDB, Git\nNice to have: Docker, AWS" });
    assert.equal(f.status, 200);
    assert.match(f.data.summary, /React and Node\.js/);
    assert.equal(f.data.talking_points.length, 3);
  });

  test("the app calls the expected Gemini paths", () => {
    const seen = mock.calls.map((c) => c.replace("/v1beta/", "/v1/")); // the version in the path depends on the SDK
    assert.ok(seen.some((c) => c.startsWith("GET /v1/models")), seen.join(" | "));
    assert.ok(seen.includes("POST /v1/models/gemini-3.8-flash:streamGenerateContent?alt=sse"), seen.join(" | "));
  });
});

describe("with no key (basic mode)", () => {
  let s, token;
  before(async () => { s = await startServer(); });
  after(async () => { await s?.stop(); });

  test("public profile: no phone, 7 projects, basic mode", async () => {
    const { data } = await s.call("GET", "/api/public/profile");
    assert.ok(!hasKey(data, "phone"));
    assert.equal(data.projects.length, 7);
    assert.equal(data.ai, "basic");
    assert.equal(data.has_owner, false);
  });

  test("chat works and the conversation can be reloaded", async () => {
    const a = await chat(s, "Tell me about NeuroCheck");
    assert.ok(a.deltas.length >= 2);
    assert.ok(a.done.sources.length >= 1);
    assert.equal(a.done.projects[0].name, "NeuroCheck");
    const saved = await s.call("GET", `/api/chat/${a.conv}`);
    assert.deepEqual(saved.data.messages.map((m) => m.role), ["user", "twin"]);
    assert.equal((await s.call("POST", `/api/chat/messages/${a.done.id}/feedback`, { value: 1 })).status, 200);
    assert.equal((await s.call("POST", `/api/chat/messages/${a.done.id}/feedback`, { value: 5 })).status, 400);
    assert.equal((await s.call("POST", `/api/chat/${a.conv}/messages`, { text: "x".repeat(601) })).status, 400);
  });

  test("the owner account can be set up only once, and admin needs a login", async () => {
    assert.equal((await s.call("GET", "/api/admin/overview")).status, 401);
    assert.equal((await s.call("POST", "/api/auth/setup", { email: "owner@example.com", password: "short" })).status, 400);
    const a = await s.call("POST", "/api/auth/setup", { email: "owner@example.com", password: "long-enough-1" });
    assert.equal(a.status, 201);
    assert.equal((await s.call("POST", "/api/auth/setup", { email: "other@example.com", password: "long-enough-2" })).status, 403);
    assert.equal((await s.call("POST", "/api/auth/login", { email: "owner@example.com", password: "wrong" })).status, 401);
    token = (await s.call("POST", "/api/auth/login", { email: "owner@example.com", password: "long-enough-1" })).data.token;
    assert.equal((await s.call("GET", "/api/auth/me", undefined, token)).data.email, "owner@example.com");
    assert.equal((await s.call("GET", "/api/admin/overview", undefined, "bad-token")).status, 401);
  });

  test("leads: bad email is refused, a good one reaches the inbox", async () => {
    assert.equal((await s.call("POST", "/api/leads", { name: "Asha", email: "nope", message: "Hi" })).status, 400);
    const ok = await s.call("POST", "/api/leads", { name: "Asha", email: "asha@example.com", company: "Acme", message: "Let's talk" });
    assert.equal(ok.status, 201);
    const inbox = (await s.call("GET", "/api/admin/leads", undefined, token)).data;
    assert.equal(inbox[0].message, "Let's talk");
    assert.equal(inbox[0].read, false);
    assert.equal((await s.call("PATCH", `/api/admin/leads/${ok.data.id}`, { read: true }, token)).status, 200);
  });

  test("an answered question is learned", async () => {
    const q = "What is your blood group?";
    assert.equal((await chat(s, q)).done.unanswered, true);
    assert.equal((await chat(s, "what is your BLOOD group")).done.unanswered, true);
    const open = (await s.call("GET", "/api/admin/unanswered", undefined, token)).data;
    assert.equal(open.length, 2);
    const item = open.find((x) => x.question === q);
    const saved = await s.call("POST", `/api/admin/unanswered/${item.id}/answer`, { answer: "It's O positive." }, token);
    assert.equal(saved.data.resolved, 2); // the same question in other words counts too
    assert.equal((await s.call("GET", "/api/admin/unanswered", undefined, token)).data.length, 0);
    assert.ok((await s.call("GET", "/api/admin/knowledge", undefined, token)).data.some((d) => d.source === "qa" && d.title === q));
    const again = await chat(s, q);
    assert.equal(again.done.unanswered, false);
    assert.match(again.done.text, /O positive/);
    const made = (await s.call("GET", "/api/public/profile")).data;
    assert.equal(made.ai_name, "Miu");
  });

  test("notes can be added, edited and deleted; the resume can't be edited here", async () => {
    const made = await s.call("POST", "/api/admin/knowledge", { source: "note", title: "Relocation", body: "Happy to relocate to Bengaluru or Pune for the right role." }, token);
    assert.equal(made.status, 201);
    assert.equal((await s.call("PUT", `/api/admin/knowledge/${made.data.id}`, { title: "Relocation", body: "Happy to relocate anywhere in India for the right role." }, token)).status, 200);
    const t = (await s.call("POST", "/api/admin/test-question", { text: "Can you relocate?" }, token)).data;
    assert.match(t.text, /anywhere in India/);
    assert.ok(t.hits[0].score > 0);
    assert.equal((await s.call("DELETE", `/api/admin/knowledge/${made.data.id}`, undefined, token)).status, 200);
    assert.equal((await s.call("PUT", "/api/admin/knowledge/resume", { title: "x", body: "y".repeat(50) }, token)).status, 400);
  });

  test("profile and projects can be edited, unsafe links are refused", async () => {
    assert.equal((await s.call("PUT", "/api/admin/profile", { portfolio: "javascript:alert(1)" }, token)).status, 400);
    const p = await s.call("PUT", "/api/admin/profile", { availability: "Open to work", show_email: false, phone: "x" }, token);
    assert.equal(p.data.availability, "Open to work");
    const pub = (await s.call("GET", "/api/public/profile")).data;
    assert.ok(!("email" in pub) && !hasKey(pub, "phone"));
    const pr = await s.call("PATCH", "/api/admin/projects/skincart", { featured: false, tagline: "A skincare page" }, token);
    assert.equal(pr.data.featured, false);
    assert.equal(pr.data.tagline, "A skincare page");
  });

  test("job fit gives a score and is counted", async () => {
    const f = await s.call("POST", "/api/fit", { jd: "Junior Full Stack Developer\nRequirements: React, Node.js, MongoDB, REST APIs, Git\nNice to have: TypeScript, Docker, AWS" });
    assert.ok(f.data.score >= 40 && f.data.score <= 95);
    assert.match(f.data.summary, /Megha matches 5 of 5/);
    assert.equal((await s.call("POST", "/api/fit", { jd: "too short" })).status, 400);
    const o = (await s.call("GET", "/api/admin/overview", undefined, token)).data;
    assert.equal(o.totals.fit_checks, 1);
    assert.equal(o.chart.length, 14);
    assert.ok(o.companies.some((c) => c.name === "Acme"));
    assert.equal(o.feedback.helpful, 1);
  });

  test("resume upload hides phones and is searchable", async () => {
    const text = `Test Person\nPune, India\nPhone: +91 98765 43210\nSummary\nStudent who enjoys building web apps and learning new tools every single week.\nPublications\nWrote a paper about underwater drone navigation with sonar maps, presented at a student conference.\nTechnical Skills\nPython, React, Node.js, SQL and a little bit of Linux administration.`;
    const form = new FormData();
    form.append("file", new Blob([text], { type: "text/plain" }), "resume.txt");
    const up = await s.call("POST", "/api/admin/resume", form, token);
    assert.equal(up.status, 200);
    assert.equal(up.data.hidden_phones, 1);
    assert.ok(up.data.sections.includes("Publications"));
    const t = (await s.call("POST", "/api/admin/test-question", { text: "Tell me about underwater drone navigation" }, token)).data;
    assert.equal(t.hits[0].heading, "Publications");
    const bad = new FormData();
    bad.append("file", new Blob(["x"], { type: "image/png" }), "photo.png");
    assert.equal((await s.call("POST", "/api/admin/resume", bad, token)).status, 400);
  });

  test("the widget and public API work from other sites, the admin API doesn't", async () => {
    const from = { headers: { origin: "https://example.com" } };
    const w = await fetch(`${s.base}/widget.js`, from);
    assert.equal(w.status, 200);
    assert.equal(w.headers.get("access-control-allow-origin"), "*");
    assert.equal((await fetch(`${s.base}/api/auth/status`, from)).headers.get("access-control-allow-origin"), null);
  });
});

test("chat is rate limited", async () => {
  const s = await startServer({ CHAT_PER_MINUTE: "3" });
  try {
    const first = await chat(s, "hi");
    const codes = [];
    for (let i = 0; i < 3; i++) codes.push((await chat(s, "hi", first.conv)).status);
    assert.deepEqual(codes, [200, 200, 429]);
  } finally { await s.stop(); }
});
