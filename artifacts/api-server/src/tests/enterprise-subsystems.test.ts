import test from "node:test";
import assert from "node:assert/strict";
import { getOperatorWorkbenchSummary } from "../lib/enterprise/operator-workbench";
import { getEvidenceExplorer } from "../lib/enterprise/evidence-explorer";
import { getExecutiveDashboard } from "../lib/enterprise/executive-dashboard";
import { getConnectorOperationsConsole } from "../lib/enterprise/connector-operations-console";
import { getValueRealizationAnalytics } from "../lib/enterprise/value-realization-analytics";

test("operator workbench function exists", () => assert.equal(typeof getOperatorWorkbenchSummary, "function"));
test("evidence explorer function exists", () => assert.equal(typeof getEvidenceExplorer, "function"));
test("executive dashboard function exists", () => assert.equal(typeof getExecutiveDashboard, "function"));
test("connector operations function exists", () => assert.equal(typeof getConnectorOperationsConsole, "function"));
test("value realization function exists", () => assert.equal(typeof getValueRealizationAnalytics, "function"));
