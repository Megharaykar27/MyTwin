// Runs the server tests, then checks that the website builds.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const step = (title, cmd, dir) => {
  console.log(`\n== ${title}`);
  execSync(cmd, { cwd: path.join(root, dir), stdio: "inherit" });
};

try {
  step("Server tests", "npm test", "server");
  step("Website build", "npm run build", "client");
  console.log("\nAll checks passed.");
} catch {
  console.error("\nA check failed. See the output above.");
  process.exit(1);
}
