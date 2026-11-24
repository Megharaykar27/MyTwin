// SQLite database (mytwin.db), created automatically. Node's built-in SQLite: nothing to compile.
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = process.env.DATABASE_FILE || path.join(here, "..", "mytwin.db");

export const db = new DatabaseSync(file);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
-- The twin's owner (only one account: the first person to set it up)
CREATE TABLE IF NOT EXISTS owners (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single row: name, links, tone, suggested questions... (JSON)
CREATE TABLE IF NOT EXISTS profile (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

-- Everything the twin knows. source: resume | github | note | qa
CREATE TABLE IF NOT EXISTS docs (
  id         TEXT PRIMARY KEY,
  source     TEXT NOT NULL,
  title      TEXT NOT NULL,
  url        TEXT,
  body       TEXT NOT NULL,
  project    TEXT,                -- project slug when the doc is about one project
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Searchable pieces of the docs (one per section)
CREATE TABLE IF NOT EXISTS chunks (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id  TEXT NOT NULL REFERENCES docs(id) ON DELETE CASCADE,
  heading TEXT NOT NULL,
  text    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  slug       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  tagline    TEXT,
  tech       TEXT NOT NULL DEFAULT '[]',
  repo       TEXT,
  demo       TEXT,
  cover      TEXT,
  aliases    TEXT NOT NULL DEFAULT '[]',
  featured   INTEGER NOT NULL DEFAULT 1,
  sort       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT PRIMARY KEY,
  visitor    TEXT NOT NULL DEFAULT '{}',  -- optional { name, company, role }
  source     TEXT NOT NULL DEFAULT 'web', -- web | widget
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  conv_id    TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,               -- user | twin
  text       TEXT NOT NULL,
  sources    TEXT NOT NULL DEFAULT '[]',
  projects   TEXT NOT NULL DEFAULT '[]',
  unanswered INTEGER NOT NULL DEFAULT 0,  -- the twin didn't know: shown to the owner to answer
  resolved   INTEGER NOT NULL DEFAULT 0,
  feedback   INTEGER NOT NULL DEFAULT 0,  -- 1 helpful, -1 not helpful
  engine     TEXT,                        -- gemini model name or "basic"
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS messages_conv ON messages(conv_id, created_at);

CREATE TABLE IF NOT EXISTS leads (
  id         TEXT PRIMARY KEY,
  conv_id    TEXT REFERENCES conversations(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  company    TEXT,
  message    TEXT NOT NULL,
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fit_checks (
  id         TEXT PRIMARY KEY,
  title      TEXT,
  score      INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

export const one = (sql, ...p) => db.prepare(sql).get(...p);
export const all = (sql, ...p) => db.prepare(sql).all(...p);
export const run = (sql, ...p) => db.prepare(sql).run(...p);
export const tx = (fn) => {
  db.exec("BEGIN");
  try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { db.exec("ROLLBACK"); throw e; }
};
