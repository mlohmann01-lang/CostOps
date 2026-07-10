import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { requireCapability } from "../middleware/security-guards";

// This suite proves the governed-execution approve/execute/cancel endpoints are no
// longer reachable with only the router-level READ_RECOMMENDATIONS capability.
//
// The route file (routes/governed-execution.ts) transitively imports @workspace/db,
// which throws at module-load time when DATABASE_URL is unset — so it cannot be
// imported directly in a DB-less unit test. Instead this suite combines:
//  1. a behavioural check of the exact guard (requireCapability("APPROVE_ACTIONS"))
//     wired onto those routes, run against every role in the system; and
//  2. a static check that the route source actually applies that guard to
//     approve/execute/cancel and not to plain read routes.

function mockReq(role: string) {
  return { __authContext: { tenantId: "tenant-a", userId: "u1", authenticated: true, platformAdminOverride: false, role } } as any;
}

function run(mw: any, req: any) {
  let statusCode: number | null = null;
  let payload: any = null;
  let nextCalled = false;
  const res: any = { status: (c: number) => ({ json: (p: any) => { statusCode = c; payload = p; } }) };
  mw(req, res, () => { nextCalled = true; });
  return { statusCode, payload, nextCalled };
}

const ROLES_WITHOUT_APPROVE_ACTIONS = ["VIEWER", "OPERATOR", "AUDITOR"];
const ROLES_WITH_APPROVE_ACTIONS = ["APPROVER", "TENANT_ADMIN", "PLATFORM_ADMIN", "GOVERNANCE_ADMIN"];

for (const role of ROLES_WITHOUT_APPROVE_ACTIONS) {
  test(`${role} role is rejected by the APPROVE_ACTIONS guard used on approve/execute/cancel`, () => {
    const result = run(requireCapability("APPROVE_ACTIONS"), mockReq(role));
    assert.equal(result.statusCode, 403);
    assert.equal(result.nextCalled, false);
    assert.equal(result.payload?.error, "CAPABILITY_FORBIDDEN");
  });
}

for (const role of ROLES_WITH_APPROVE_ACTIONS) {
  test(`${role} role passes the APPROVE_ACTIONS guard used on approve/execute/cancel`, () => {
    const result = run(requireCapability("APPROVE_ACTIONS"), mockReq(role));
    assert.equal(result.nextCalled, true);
    assert.equal(result.statusCode, null);
  });
}

test("governed-execution approve/execute/cancel routes are wired to the APPROVE_ACTIONS capability guard, and plain reads are not", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "src/routes/governed-execution.ts"), "utf8");

  const approveLine = source.split("\n").find((l) => l.includes("'/plans/:id/approve'"));
  const executeLine = source.split("\n").find((l) => l.includes("'/plans/:id/execute'"));
  const cancelLine = source.split("\n").find((l) => l.includes("'/plans/:id/cancel'"));
  const listPlansLine = source.split("\n").find((l) => l.includes("router.get('/plans',"));

  assert.ok(approveLine?.includes("requireCapability('APPROVE_ACTIONS')"), "approve route must carry the APPROVE_ACTIONS guard");
  assert.ok(executeLine?.includes("requireCapability('APPROVE_ACTIONS')"), "execute route must carry the APPROVE_ACTIONS guard");
  assert.ok(cancelLine?.includes("requireCapability('APPROVE_ACTIONS')"), "cancel route must carry the APPROVE_ACTIONS guard");
  assert.ok(listPlansLine && !listPlansLine.includes("requireCapability"), "read-only list route should rely only on the router-level READ_RECOMMENDATIONS guard");
});
