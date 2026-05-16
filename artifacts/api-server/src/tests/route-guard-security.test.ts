import test from "node:test";
import assert from "node:assert/strict";
import { requireCapability, requireTenantContext } from "../middleware/security-guards";

function mkReq(headers: Record<string,string>, query: Record<string,string> = {}) { return { header:(k:string)=>headers[k], query } as any; }

function run(mw: any, req: any) {
  let statusCode = 200;
  let payload: any;
  mw(req, { status:(c:number)=>({ json:(p:any)=>{ statusCode=c; payload=p; } }), json:(p:any)=>{ payload=p; } } as any, ()=>{});
  return { statusCode, payload };
}

test("tenant guard denies cross-tenant access", ()=>{
  const r = run(requireTenantContext(), mkReq({"x-tenant-id":"a","x-role":"OPERATOR"},{tenantId:"b"}));
  assert.equal(r.statusCode, 403);
});

test("capability guard denies unauthorized capability", ()=>{
  const r = run(requireCapability("MANAGE_POLICIES"), mkReq({"x-tenant-id":"a","x-role":"OPERATOR"},{tenantId:"a"}));
  assert.equal(r.statusCode, 403);
});
