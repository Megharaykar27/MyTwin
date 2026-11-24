// A tiny in-process server that imitates the Gemini REST API used by @google/genai (tests never call the real one).
import http from "node:http";

export async function startMockGemini() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (d) => (body += d));
    req.on("end", () => {
      calls.push(`${req.method} ${req.url}`);
      const path = req.url.split("?")[0];
      const json = (data) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(data)); };
      const piece = (text) => ({ candidates: [{ content: { role: "model", parts: [{ text }] } }] });

      if (req.method === "GET" && ["/v1/models", "/v1beta/models"].includes(path)) // newer SDK versions call /v1, older ones /v1beta
        return json({ models: [{ name: "models/gemini-3.8-flash", supportedGenerationMethods: ["generateContent"] }] });

      if (path.endsWith(":streamGenerateContent")) {
        const last = JSON.parse(body).contents.at(-1).parts.map((p) => p.text).join("");
        const pieces = last.includes("salary of the CEO")
          ? ["[NO_A", "NSWER] I don't have that detail, ", "but you can leave a message."]
          : ["Megha built Neuro", "Check, a stroke-risk app with ", "leak-safe testing [1]."];
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const [i, t] of pieces.entries()) setTimeout(() => {
          res.write(`data: ${JSON.stringify(piece(t))}\r\n\r\n`);
          if (i === pieces.length - 1) res.end();
        }, 15 * i);
        return;
      }

      if (path.endsWith(":generateContent"))
        return json(piece(JSON.stringify({ summary: "Megha matches most of this role. She knows React and Node.js. She is still learning Docker.", talking_points: ["React projects", "Node.js APIs", "Fast learner"] })));

      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { code: 404, message: `mock: ${req.method} ${req.url} not found` } }));
    });
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, calls, close: () => new Promise((ok) => { server.closeAllConnections(); server.close(ok); }) };
}
