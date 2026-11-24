// MyTwin API server
import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { seedIfEmpty } from "./lib/knowledge.js";
import { geminiOn } from "./providers/gemini.js";
import authRoutes from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import chatRoutes from "./routes/chat.js";
import fitRoutes from "./routes/fit.js";
import adminRoutes from "./routes/admin.js";

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
  console.warn("JWT_SECRET is missing in server/.env, so a random one is used (you'll be logged out on every restart).");
}

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5005;
const origins = (process.env.CLIENT_URL || "http://localhost:5177").split(",").map((s) => s.trim()).filter(Boolean);

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// The widget runs on other websites, so the public parts accept any origin. The admin parts don't.
const OPEN = /^\/(widget\.js|api\/public(\/|$)|api\/chat(\/|$)|api\/fit(\/|$)|api\/leads(\/|$))/;
app.use(cors((req, cb) => cb(null, { origin: OPEN.test(req.path) ? "*" : origins })));
app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.get("/widget.js", (_req, res) => res.type("application/javascript").sendFile(path.join(here, "public", "widget.js")));
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/fit", fitRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", publicRoutes);

app.use((_req, res) => res.status(404).json({ message: "Not found." }));
app.use((err, _req, res, _next) => {
  if (res.headersSent) return res.end();
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ message: "That file is too big (max 5 MB)." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ message: "That request isn't valid JSON." });
  const status = err.status || (err.name === "MulterError" ? 400 : 500);
  if (status >= 500 && !err.status) {
    console.error(err);
    return res.status(status).json({ message: "Something went wrong. Please try again." });
  }
  if (status >= 500) console.error(err.message);
  res.status(status).json({ message: err.message });
});

seedIfEmpty();
app.listen(PORT, () => console.log(`MyTwin API on http://localhost:${PORT}  AI: ${geminiOn ? "Gemini" : "basic"}`));
