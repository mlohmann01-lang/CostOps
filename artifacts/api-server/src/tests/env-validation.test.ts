import test from "node:test"; import assert from "node:assert/strict";
import { validateEnv } from "../lib/config/env"; import { featureFlags } from "../lib/config/feature-flags";

test("missing prod env fails closed", ()=>{
  const prev=process.env.RUNTIME_ENV; const prevDb=process.env.DATABASE_URL; const prevJwt=process.env.JWT_SECRET; const prevOrigins=process.env.ALLOWED_ORIGINS;
  process.env.RUNTIME_ENV='production'; delete process.env.DATABASE_URL; delete process.env.JWT_SECRET; process.env.ALLOWED_ORIGINS='*';
  const result = validateEnv();
  assert.equal(result.errors.length > 0, true);
  process.env.RUNTIME_ENV=prev; if(prevDb) process.env.DATABASE_URL=prevDb; if(prevJwt) process.env.JWT_SECRET=prevJwt; if(prevOrigins) process.env.ALLOWED_ORIGINS=prevOrigins;
});
test("development mode gets jwt fallback", ()=> {
  const prev=process.env.RUNTIME_ENV; const prevJwt=process.env.JWT_SECRET;
  process.env.RUNTIME_ENV='development'; delete process.env.JWT_SECRET;
  const result=validateEnv();
  assert.equal(result.jwtSecret.startsWith('dev-local-'), true);
  process.env.RUNTIME_ENV=prev; if(prevJwt) process.env.JWT_SECRET=prevJwt;
});
test("feature flags respected", ()=>{ process.env.LIVE_EXECUTION_ENABLED='true'; assert.equal(featureFlags().LIVE_EXECUTION_ENABLED,true); });
