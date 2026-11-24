// Gemini (free key: https://aistudio.google.com/apikey) writes the twin's answers.
// Without a key the twin still works in "basic" mode (answers built from the matching facts).
import { GoogleGenAI } from "@google/genai";

const KEY = process.env.GEMINI_API_KEY;
const CHOSEN = (process.env.GEMINI_MODEL || "").trim(); // empty = pick the newest Flash model automatically
const ai = KEY ? new GoogleGenAI({ apiKey: KEY, ...(process.env.GEMINI_BASE_URL ? { httpOptions: { baseUrl: process.env.GEMINI_BASE_URL } } : {}) }) : null;
export const geminiOn = !!ai;

// Google retires model names often, so we ask the API which Flash models this key can use
// and try the newest version first. Used only if the list can't be read:
const KNOWN = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
const version = (name) => Number(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] || 0);
const isLite = (name) => name.endsWith("-lite");
let available = null;
const retired = new Set();

async function candidates() {
  if (!available) {
    try {
      const names = [];
      const pager = await ai.models.list({ config: { pageSize: 200 } });
      for await (const m of pager) {
        const name = String(m.name || "").replace(/^models\//, "");
        const canGenerate = !m.supportedActions || m.supportedActions.includes("generateContent");
        if (canGenerate && /^gemini-\d+(\.\d+)?-flash(-lite)?$/.test(name)) names.push(name); // stable text Flash models only
      }
      if (names.length) {
        available = names.sort((a, b) => version(b) - version(a) || isLite(a) - isLite(b)).slice(0, 5);
        console.log(`Gemini models: ${available.join(", ")}`);
      }
    } catch (e) {
      console.warn("Couldn't list Gemini models, using the built-in list:", e.status || "", String(e.message).slice(0, 120));
    }
    if (!available) available = KNOWN;
  }
  return [...new Set([CHOSEN, ...available].filter(Boolean))].filter((m) => !retired.has(m));
}

const retryable = (e) => [404, 429, 500, 503].includes(e?.status) || /overloaded|unavailable|quota|resource.?exhausted|not found|no longer available|fetch failed|timeout/i.test(e?.message || "");
const noteFailure = (model, e) => {
  console.error(`Gemini (${model}): ${e.status || ""} ${String(e.message).slice(0, 300)}`);
  if (e?.status === 404 || /no longer available|not found/i.test(e?.message || "")) retired.add(model);
};

// One JSON / text answer, trying the next model if one is busy or retired
export async function generate(request) {
  let lastError;
  for (const model of await candidates()) {
    try {
      const res = await ai.models.generateContent({ ...request, model });
      return { text: res.text || "", model };
    } catch (e) {
      lastError = e;
      noteFailure(model, e);
      if (!retryable(e)) break;
    }
  }
  throw lastError;
}

// Streams text pieces. Falls back to the next model only if nothing was sent yet.
export async function* stream(request) {
  let lastError;
  for (const model of await candidates()) {
    let sent = false;
    try {
      const it = await ai.models.generateContentStream({ ...request, model });
      for await (const part of it) {
        const t = part.text || "";
        if (t) { sent = true; yield { text: t, model }; }
      }
      return;
    } catch (e) {
      lastError = e;
      noteFailure(model, e);
      if (sent || !retryable(e)) break;
    }
  }
  throw lastError;
}

// Turns a Gemini error into a message the owner can act on (shown in the admin panel and server log)
export function explainGeminiError(e) {
  const m = String(e?.message || "");
  if ((e?.status === 400 && /api key/i.test(m)) || [401, 403].includes(e?.status) || /API_KEY_INVALID|permission/i.test(m))
    return "The Gemini key in server/.env isn't valid. Copy it again from aistudio.google.com/apikey (no quotes or spaces), then restart.";
  if (e?.status === 429 || /quota|resource.?exhausted/i.test(m)) return "Gemini's free limit is used up for now.";
  if (e?.status === 503 || /overloaded|unavailable/i.test(m)) return "Gemini is busy right now.";
  if (/fetch failed|ENOTFOUND|ECONNRESET|timeout/i.test(m)) return "Couldn't reach Gemini (internet connection).";
  if (e?.status === 404 || /no longer available|not found/i.test(m)) return "No Gemini model is available for this key. Remove GEMINI_MODEL from server/.env and restart.";
  return `Gemini error: ${m.replace(/\s+/g, " ").slice(0, 140)}`;
}
