// Reads the twin's streamed answer (server-sent events over fetch)
import { API_URL } from "./api.js";

// Splits a growing text into complete events. Lines may arrive cut in the middle, so the rest is kept for later.
export function makeParser(onEvent) {
  let buffer = "", event = "message", data = [];
  return (chunk) => {
    buffer += chunk;
    let i;
    while ((i = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, i).replace(/\r$/, "");
      buffer = buffer.slice(i + 1);
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
      else if (line === "" && data.length) {
        let parsed = null;
        try { parsed = JSON.parse(data.join("\n")); } catch { /* skip a broken event */ }
        if (parsed) onEvent(event, parsed);
        event = "message";
        data = [];
      }
    }
  };
}

export async function streamChat(convId, text, { onDelta, onMeta, onDone, onError, signal } = {}) {
  let finished = false;
  try {
    const res = await fetch(`${API_URL}/api/chat/${convId}/messages`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }), signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return onError?.({ message: body?.message || "Something went wrong. Please try again.", status: res.status });
    }
    const feed = makeParser((event, data) => {
      if (event === "delta") onDelta?.(data.text);
      else if (event === "meta") onMeta?.(data);
      else if (event === "done") { finished = true; onDone?.(data); }
      else if (event === "error") { finished = true; onError?.(data); }
    });
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      feed(decoder.decode(value, { stream: true }));
    }
    feed("\n\n");
    if (!finished) onError?.({ message: "The answer stopped early. Please try again." });
  } catch (e) {
    if (e.name === "AbortError") return onError?.({ aborted: true });
    onError?.({ message: "Can't reach the server. Please try again." });
  }
}
