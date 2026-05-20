import { readFileSync } from "node:fs";
import { join } from "node:path";
import glob from "fast-glob";

const forbidden = [/observability platform/i, /governance middleware/i, /kubernetes/i, /devops console/i, /runtime governance/i, /runtime platform/i, /runtime control plane/i, /runtime orchestration/i];
const supportedActions = ["SIMULATE", "REQUEST_APPROVAL", "APPROVE", "REJECT", "EXECUTE", "ROLLBACK", "ESCALATE", "QUARANTINE", "MARK_MANUAL_ONLY", "REQUEST_MORE_EVIDENCE", "ACKNOWLEDGE_DRIFT"];
const files = await glob(["src/components/mockups/**/*.tsx", "src/components/ops/**/*.tsx", "src/lib/**/*.ts"], { cwd: process.cwd() });
const stateFile = readFileSync(join(process.cwd(), "src/lib/ops-state.ts"), "utf8");
const requiredStates = (stateFile.match(/"[A-Z_]+"/g) ?? []).map((s) => s.replaceAll('"', ''));
let fail = false;

for (const file of files) {
  const content = readFileSync(join(process.cwd(), file), "utf8");
  forbidden.forEach((re) => { if (re.test(content)) { console.error(`[forbidden-terminology] ${file}: ${re}`); fail = true; } });
  if (/const\s+[A-Z_]+\s*=\s*\[/.test(content) && file.includes("components/")) { console.error(`[duplicate-local-state-enum] ${file}`); fail = true; }
  if (file.includes("components/") && /fetch\(/.test(content)) { console.error(`[raw-fetch] ${file}`); fail = true; }
  if (file.includes("components/ops/") && /onClick=\{\(\) => [^}]+(APPROVE|REJECT|EXECUTE|ROLLBACK)/.test(content) && !content.includes("ExecutionIntentDto")) { console.error(`[direct-action-handler-without-intent] ${file}`); fail = true; }
  if (file.includes("components/ops/") && /(Approve|Reject|Execute|Rollback)/.test(content) && !file.includes("OperationalComponents") && !content.includes("OperatorActionBar")) { console.error(`[hardcoded-action-label-outside-action-bar] ${file}`); fail = true; }
  if (file.includes("components/ops/") && /Intent result/.test(content) && !/INTENT_REJECTED|INTENT_BLOCKED|INTENT_DUPLICATE/.test(content)) { console.error(`[success-without-rejection-handling] ${file}`); fail = true; }
  if (file.includes("components/") && !/Loading|loading|error|empty|No governed execution opportunities/.test(content) && file.includes("EconomicOperationsSuite")) { console.error(`[state-coverage] ${file} missing explicit loading/error/empty UX`); fail = true; }
  if (file.includes("components/ops/") && !/Rollback|Approval|Proof/.test(content)) { console.error(`[visibility-coverage] ${file} missing rollback/approval/proof visibility`); fail = true; }
  for (const match of content.matchAll(/"([A-Z_]{4,})"/g)) {
    if (match[1].includes("_") && match[1].endsWith("DRIFT") && !supportedActions.includes(match[1]) && !requiredStates.includes(match[1])) {
      console.error(`[unsupported-state-transition-label] ${file} ${match[1]}`); fail = true;
    }
  }
  if (/framer-motion|animate-/.test(content)) { console.error(`[excessive-animation] ${file}`); fail = true; }
}

for (const label of requiredStates) {
  if (!stateFile.includes(label)) { console.error(`[state-system] missing ${label}`); fail = true; }
}

if (!files.some((f) => readFileSync(join(process.cwd(), f), "utf8").includes("ProofDrawer"))) { console.error("[proof-expansion] missing proof expansion UX"); fail = true; }
if (fail) process.exit(1);
console.log(`ux-enforcement passed across ${files.length} files`);
