import test from "node:test"; import assert from "node:assert/strict";
import { validateEnv } from "../lib/config/env"; import { featureFlags } from "../lib/config/feature-flags";

test("missing prod env fails", ()=>{ const prev=process.env.RUNTIME_ENV; const prevDb=process.env.DATABASE_URL; process.env.RUNTIME_ENV='PROD'; delete process.env.DATABASE_URL; assert.throws(()=>validateEnv()); process.env.RUNTIME_ENV=prev; if(prevDb) process.env.DATABASE_URL=prevDb; });
test("feature flags respected", ()=>{ process.env.LIVE_EXECUTION_ENABLED='true'; assert.equal(featureFlags().LIVE_EXECUTION_ENABLED,true); });
