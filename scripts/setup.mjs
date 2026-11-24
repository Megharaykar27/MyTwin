// One-command setup: checks Node, installs everything and creates the .env files.
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`MyTwin needs Node.js 22.13 or newer (you have ${process.versions.node}). Download it from https://nodejs.org and run this again.`);
  process.exit(1);
}

for (const dir of [".", "server", "client"]) {
  console.log(`\nInstalling packages in ${dir === "." ? "the root folder" : dir}...`);
  execSync("npm install --no-fund --no-audit", { cwd: path.join(root, dir), stdio: "inherit" });
}

// Create the .env files from the examples (an existing .env is never touched)
for (const dir of ["server", "client"]) {
  const env = path.join(root, dir, ".env");
  if (fs.existsSync(env)) continue;
  const example = fs.readFileSync(path.join(root, dir, ".env.example"), "utf8");
  fs.writeFileSync(env, example.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${crypto.randomBytes(48).toString("hex")}`));
  console.log(`Created ${dir}/.env`);
}

console.log(`
MyTwin is ready.

  Start it:     npm run dev
  Website:      http://localhost:5177
  Admin panel:  http://localhost:5177/admin

  Optional: for natural AI answers, get a free Gemini key at
  https://aistudio.google.com/apikey and put it in server/.env (GEMINI_API_KEY=).
`);
