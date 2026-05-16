import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const registryPath = path.join(root, "docs/architecture/platform-authority-registry.md");
const checkpointPath = path.join(root, "docs/checkpoints/checkpoints-33-35-enterprise-hardening-pilot-readiness.md");
const reportPath = path.join(root, "docs/architecture/authority-usage-report.md");

const requiredModules = [
  "artifacts/api-server/src/lib/governance/policy-engine.ts",
  "artifacts/api-server/src/lib/workflow/workflow-operations-service.ts",
  "artifacts/api-server/src/lib/trust-engine.ts",
  "artifacts/api-server/src/lib/reconciliation/reconciliation-engine.ts",
  "artifacts/api-server/src/lib/execution-orchestration/execution-orchestration-service.ts",
  "artifacts/api-server/src/lib/observability/operational-telemetry-service.ts",
  "artifacts/api-server/src/lib/enterprise-graph/operational-entity-graph-service.ts",
  "artifacts/api-server/src/lib/playbooks/playbook-recommendation-service.ts",
  "artifacts/api-server/src/lib/simulations/policy-simulation-service.ts",
  "artifacts/api-server/src/lib/security/authorization-service.ts",
  "artifacts/api-server/src/lib/pilot-readiness-service.ts",
];

const lines: string[] = ["# Authority Usage Report", "", `Generated: ${new Date().toISOString()}`, ""];
lines.push(`- Registry exists: ${fs.existsSync(registryPath)}`);
const checkpointLines = fs.existsSync(checkpointPath) ? fs.readFileSync(checkpointPath, "utf8").split("\n").length : 0;
lines.push(`- Consolidated checkpoint doc lines: ${checkpointLines}`);
lines.push("");
lines.push("## Canonical Module Presence");
for (const m of requiredModules) {
  lines.push(`- ${m}: ${fs.existsSync(path.join(root, m)) ? "FOUND" : "MISSING"}`);
}
fs.writeFileSync(reportPath, lines.join("\n") + "\n");
console.log(`Wrote ${path.relative(root, reportPath)}`);
