import test from "node:test"; import assert from "node:assert/strict";
import { buildWorkflowQueue } from "../lib/workflows/workflow-orchestrator"; import { explainBlocked } from "../lib/intelligence/explanations";

test("workflow queue generated", ()=>{ assert.equal(buildWorkflowQueue({onboarding:1,approvals:2,blockers:3}).length,3); });
test("intelligence explanation evidence linked", ()=>{ assert.equal(explainBlocked('policy',{}).evidenceLinked,true); });
