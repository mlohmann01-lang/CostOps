import { readFileSync } from "node:fs";
import { join } from "node:path";
import glob from "fast-glob";

const forbidden = [/observability platform/i, /governance middleware/i, /kubernetes/i, /devops console/i, /runtime governance/i, /runtime platform/i, /runtime control plane/i, /runtime orchestration/i];
const files = await glob(["src/components/mockups/**/*.tsx", "src/components/ops/**/*.tsx", "src/lib/**/*.ts"], { cwd: process.cwd() });
const stateFile = readFileSync(join(process.cwd(), "src/lib/ops-state.ts"), "utf8");
const requiredStates = (stateFile.match(/"[A-Z_]+"/g) ?? []).map((s) => s.replaceAll('"', ''));
let fail = false;

for (const file of files) {
  const content = readFileSync(join(process.cwd(), file), "utf8");
  forbidden.forEach((re) => { if (re.test(content)) { console.error(`[forbidden-terminology] ${file}: ${re}`); fail = true; } });
  if (/const\s+[A-Z_]+\s*=\s*\[/.test(content) && file.includes("components/")) { console.error(`[duplicate-local-state-enum] ${file}`); fail = true; }
  if (file.includes("components/") && !/Loading|loading|error|empty|No governed execution opportunities/.test(content) && file.includes("EconomicOperationsSuite")) { console.error(`[state-coverage] ${file} missing explicit loading/error/empty UX`); fail = true; }
  if (/framer-motion|animate-/.test(content)) { console.error(`[excessive-animation] ${file}`); fail = true; }
}

for (const label of requiredStates) {
  if (!stateFile.includes(label)) { console.error(`[state-system] missing ${label}`); fail = true; }
}

if (!files.some((f) => readFileSync(join(process.cwd(), f), "utf8").includes("ProofDrawer"))) { console.error("[proof-expansion] missing proof expansion UX"); fail = true; }
if (fail) process.exit(1);
console.log(`ux-enforcement passed across ${files.length} files`);
