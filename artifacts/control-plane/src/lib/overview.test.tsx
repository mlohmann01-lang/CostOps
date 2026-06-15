import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  demoPilotWorkspaceSummary,
  liveEmptyPilotWorkspaceSummary,
} from "../hooks/usePilotWorkspaceData";
import { NAV_GROUPS } from "../components/layout/Sidebar";
const read = (path: string) =>
  fs.readFileSync(new URL(path, import.meta.url), "utf8");
test("Workspace renders control-center sections and KPI row", () => {
  const page = read("../pages/PilotWorkspace.tsx");
  for (const snippet of [
    "Workspace Control Center",
    "Finance verified value",
    "Tenant Readiness",
    "Executive Value Summary",
    "Commercial Position",
    "Financial Truth",
    "Ownership Coverage",
    "Actions & Approvals",
    "Evidence & Trust",
    "Economic Graph Health",
    "Recommended Next Steps",
  ])
    assert.equal(page.includes(snippet), true);
  assert.equal(page.includes('testId="tenant-readiness"'), true);
});
test("Workspace route and sidebar link are wired without authority-shaped navigation", () => {
  const app = read("../App.tsx");
  assert.equal(
    app.includes("import PilotWorkspace from './pages/PilotWorkspace'"),
    true,
  );
  assert.equal(app.includes("/workspace"), true);
  const labels = NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => `${item.label}:${item.href}`),
  ).join(" | ");
  assert.match(labels, /Workspace:\/workspace/);
  for (const forbidden of [
    "Technology Commercial Authority",
    "Financial Truth Authority",
    "Ownership Intelligence",
    "Outcome Finance Reconciliation",
  ])
    assert.equal(labels.includes(forbidden), false);
});
test("Workspace demo and live summaries are mode guarded", () => {
  const demo = demoPilotWorkspaceSummary("demo");
  const live = liveEmptyPilotWorkspaceSummary("live");
  assert.equal(demo.demoBanner?.label, "Demo data");
  assert.equal(live.demoBanner, undefined);
  assert.equal(live.executiveValue.financeVerifiedValue, undefined);
  assert.equal(live.executiveValue.status, "UNAVAILABLE");
  assert.equal(live.nextSteps.length > 0, true);
});
