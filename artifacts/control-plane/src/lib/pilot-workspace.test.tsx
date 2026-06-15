import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  demoPilotWorkspaceSummary,
  liveEmptyPilotWorkspaceSummary,
  pilotWorkspaceApiPaths,
} from "../hooks/usePilotWorkspaceData";
import { renderPilotWorkspaceSummary } from "../pages/PilotWorkspace";
import { NAV_GROUPS } from "../components/layout/Sidebar";
const read = (path: string) =>
  fs.readFileSync(new URL(path, import.meta.url), "utf8");
test("Pilot Workspace route and sidebar preserve existing workspace navigation", () => {
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
  assert.equal(labels.includes("Technology Commercial Authority"), false);
  assert.equal(labels.includes("Financial Truth Authority"), false);
  assert.equal(labels.includes("Ownership Intelligence"), false);
  assert.equal(labels.includes("Outcome Finance Reconciliation"), false);
});
test("Pilot Workspace calls workspace aggregation endpoint instead of ten UI APIs", () => {
  assert.deepEqual(pilotWorkspaceApiPaths, [
    "/api/workspace/pilot-summary",
    "/api/workspace/pilot-summary/audit",
  ]);
  const hook = read("../hooks/usePilotWorkspaceData.ts");
  assert.equal(hook.includes("/api/workspace/pilot-summary"), true);
});
test("renders demo banner in demo mode and not live mode", () => {
  const demo = renderPilotWorkspaceSummary(demoPilotWorkspaceSummary("demo"));
  const live = renderPilotWorkspaceSummary(
    liveEmptyPilotWorkspaceSummary("live"),
  );
  assert.equal(demo.demoBanner, "Demo data");
  assert.equal(live.demoBanner, "");
});
test("live empty states render unavailable not synthetic zero value", () => {
  const live = liveEmptyPilotWorkspaceSummary("live");
  const rendered = renderPilotWorkspaceSummary(live);
  assert.equal(rendered.financeVerified, "Not available");
  assert.equal(rendered.commercialUnavailable, true);
  assert.equal(rendered.financialUnavailable, true);
  assert.equal(rendered.ownershipUnavailable, true);
  assert.equal(live.executiveValue.financeVerifiedValue, undefined);
  assert.equal(live.demoBanner, undefined);
});
test("finance verified value renders when available", () => {
  const demo = renderPilotWorkspaceSummary(demoPilotWorkspaceSummary("demo"));
  assert.match(demo.financeVerified, /\$96,000/);
});
test("workspace page contains required customer-facing cards and next steps", () => {
  const page = read("../pages/PilotWorkspace.tsx");
  for (const snippet of [
    "Workspace Control Center",
    "Tenant Readiness",
    "Executive Value Summary",
    "Commercial Position",
    "Financial Truth",
    "Ownership Coverage",
    "Actions & Approvals",
    "Evidence & Trust",
    "Economic Graph Health",
    "Recommended Next Steps",
    "Finance verified value",
  ])
    assert.equal(page.includes(snippet), true);
  for (const forbidden of [
    "Technology Commercial Authority",
    "Outcome Finance Reconciliation",
  ])
    assert.equal(page.includes(forbidden), false);
});
