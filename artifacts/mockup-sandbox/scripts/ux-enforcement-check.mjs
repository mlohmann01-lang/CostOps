import { readFileSync } from "node:fs";
import { join } from "node:path";
import glob from "fast-glob";

const forbidden = [/observability platform/i, /governance middleware/i, /kubernetes/i, /devops console/i, /runtime governance/i, /runtime platform/i, /runtime control plane/i, /runtime orchestration/i];
const supportedActions = ["SIMULATE", "REQUEST_APPROVAL", "APPROVE", "REJECT", "EXECUTE", "ROLLBACK", "ESCALATE", "QUARANTINE", "MARK_MANUAL_ONLY", "REQUEST_MORE_EVIDENCE", "ACKNOWLEDGE_DRIFT"];
const files = await glob(["src/components/mockups/**/*.tsx", "src/components/ops/**/*.tsx", "src/lib/**/*.ts"], { cwd: process.cwd() });
const stateFile = readFileSync(join(process.cwd(), "src/lib/ops-state.ts"), "utf8");
const clientFile = readFileSync(join(process.cwd(), "src/lib/economic-operations-client.ts"), "utf8");
const requiredStates = (stateFile.match(/"[A-Z_]+"/g) ?? []).map((s) => s.replaceAll('"', ''));
let fail = false;

if (!/VITE_ECONOMIC_OPS_PREVIEW_MODE/.test(clientFile)) { console.error("[preview-flag-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (!/VITE_ECONOMIC_OPS_PILOT_SCENARIO/.test(clientFile)) { console.error("[pilot-scenario-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (!/VITE_ECONOMIC_OPS_TENANT_MODE/.test(clientFile)) { console.error("[tenant-mode-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (!/m365-disabled-user-reclaim/.test(clientFile)) { console.error("[m365-pilot-fixture-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (!/tenantMode === "DEMO"/.test(clientFile)) { console.error("[fixture-without-demo-mode-guard] src/lib/economic-operations-client.ts"); fail = true; }
if (!/ledgerEnvironment|isFixtureBacked|sourceOfTruth/.test(clientFile)) { console.error("[outcome-metadata-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (/submitExecutionIntent\s*:\s*async[\s\S]*INTENT_ACCEPTED/.test(clientFile) && !/previewMode/.test(clientFile)) { console.error("[intent-local-success-without-preview-guard] src/lib/economic-operations-client.ts"); fail = true; }
if (!/submitExecutionIntent[\s\S]*\/economic-operations\/intent/.test(clientFile)) { console.error("[intent-endpoint-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (!/getActionHistory[\s\S]*\/economic-operations\/actions\//.test(clientFile)) { console.error("[action-history-endpoint-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (!/getProofGraph[\s\S]*\/economic-operations\/proof\//.test(clientFile)) { console.error("[proof-endpoint-missing] src/lib/economic-operations-client.ts"); fail = true; }
if (!/getOutcomeLedgerSummary[\s\S]*\/economic-operations\/outcomes\//.test(clientFile)) { console.error("[outcomes-endpoint-missing] src/lib/economic-operations-client.ts"); fail = true; }

for (const file of files) {
  const content = readFileSync(join(process.cwd(), file), "utf8");
  forbidden.forEach((re) => { if (re.test(content)) { console.error(`[forbidden-terminology] ${file}: ${re}`); fail = true; } });
  if (/const\s+[A-Z_]+\s*=\s*\[/.test(content) && file.includes("components/")) { console.error(`[duplicate-local-state-enum] ${file}`); fail = true; }
  if (file.includes("components/") && /fetch\(/.test(content)) { console.error(`[raw-fetch] ${file}`); fail = true; }
  if (file.includes("components/ops/") && /\/economic-operations\/intent/.test(content)) { console.error(`[hardcoded-intent-endpoint-outside-client] ${file}`); fail = true; }
  if (file.includes("components/ops/") && /onClick=\{\(\) => [^}]+(APPROVE|REJECT|EXECUTE|ROLLBACK)/.test(content) && !content.includes("ExecutionIntentDto")) { console.error(`[direct-action-handler-without-intent] ${file}`); fail = true; }
  if (file.includes("components/ops/") && /(Approve|Reject|Execute|Rollback)/.test(content) && !file.includes("OperationalComponents") && !content.includes("OperatorActionBar")) { console.error(`[hardcoded-action-label-outside-action-bar] ${file}`); fail = true; }
  if (file.includes("components/ops/EconomicOperationsSuite") && !/getActionHistory\(/.test(content)) { console.error("[missing-backend-action-history-usage] src/components/ops/EconomicOperationsSuite.tsx"); fail = true; }
  if (file.includes("components/ops/EconomicOperationsSuite") && !/INTENT_REJECTED|INTENT_BLOCKED|INTENT_DUPLICATE|deterministic rejection/.test(content)) { console.error("[missing-rejection-handling] src/components/ops/EconomicOperationsSuite.tsx"); fail = true; }
  if (file.includes("components/ops/EconomicOperationsSuite") && !/Preview mode is ON|API mode is ON/.test(content)) { console.error("[preview-indicator-missing] src/components/ops/EconomicOperationsSuite.tsx"); fail = true; }
  if (file.includes("components/ops/EconomicOperationsSuite") && !/Pilot readiness checklist/.test(content)) { console.error("[pilot-checklist-missing] src/components/ops/EconomicOperationsSuite.tsx"); fail = true; }
  if (file.includes("components/ops/EconomicOperationsSuite") && !/INTENT_BLOCKED_BY_TENANT_MODE/.test(content)) { console.error("[tenant-mode-intent-boundary-missing] src/components/ops/EconomicOperationsSuite.tsx"); fail = true; }
  if (file.includes("components/ops/EconomicOperationsSuite") && !/ledgerEnvironment|sourceOfTruth|isFixtureBacked/.test(content)) { console.error("[outcome-environment-visibility-missing] src/components/ops/EconomicOperationsSuite.tsx"); fail = true; }
  if (file.includes("components/ops/EconomicOperationsSuite") && !/M365 Optimization & Governance/.test(content)) { console.error("[pilot-narrative-missing] src/components/ops/EconomicOperationsSuite.tsx"); fail = true; }
  if (file.includes("components/") && !/Loading|loading|error|empty|No governed execution opportunities/.test(content) && file.includes("EconomicOperationsSuite")) { console.error(`[state-coverage] ${file} missing explicit loading/error/empty UX`); fail = true; }
  if (file.includes("components/ops/") && !/Rollback|Approval|Proof/.test(content)) { console.error(`[visibility-coverage] ${file} missing rollback/approval/proof visibility`); fail = true; }
  for (const match of content.matchAll(/"([A-Z_]{4,})"/g)) {
    if (match[1].includes("_") && match[1].endsWith("DRIFT") && !supportedActions.includes(match[1]) && !requiredStates.includes(match[1])) {
      console.error(`[unsupported-state-transition-label] ${file} ${match[1]}`); fail = true;
    }
  }
  if (/framer-motion|animate-/.test(content)) { console.error(`[excessive-animation] ${file}`); fail = true; }
}

if (!files.some((f) => readFileSync(join(process.cwd(), f), "utf8").includes("ProofDrawer"))) { console.error("[proof-expansion] missing proof expansion UX"); fail = true; }
if (fail) process.exit(1);
console.log(`ux-enforcement passed across ${files.length} files`);
