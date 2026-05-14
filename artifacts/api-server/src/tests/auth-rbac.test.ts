import test from "node:test"; import assert from "node:assert/strict";
import { requireRole, requireTenantAccess } from "../lib/auth/rbac";

test("rbac role enforcement", ()=>{ assert.throws(()=>requireRole({role:"VIEWER"} as any,"OPERATOR")); });
test("tenant access enforcement", ()=>{ assert.throws(()=>requireTenantAccess({role:"OPERATOR",tenantId:"a",platformAdminOverride:false} as any,"b")); });
