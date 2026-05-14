import test from "node:test"; import assert from "node:assert/strict";
import { startupReport } from "../lib/runtime/startup-report"; import { runtimeHealth } from "../lib/runtime/runtime-health";

test("startup report exists", ()=>{ assert.equal(typeof startupReport(),"object"); });
test("runtime health has scheduler/connectors", ()=>{ const h=runtimeHealth(); assert.ok("scheduler" in h && "connectors" in h); });
