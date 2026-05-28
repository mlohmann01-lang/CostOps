import { Router } from 'express';
import { resolvePermissions } from '../lib/security/permission-resolver';
import type { Role, UserContext } from '../lib/security/rbac-types';

const router = Router();
const roleFrom = (req:any):Role => String(req.header('x-role') ?? req.query.role ?? 'READ_ONLY_OBSERVER') as Role;
const tenantFrom = (req:any)=>String(req.tenantId ?? req.query.tenantId ?? req.header('x-tenant-id') ?? 'default');

router.get('/security/me', (req,res)=>{
  const role = roleFrom(req);
  const me: UserContext = { userId: String(req.header('x-user-id') ?? 'operator'), tenantId: tenantFrom(req), role, environment: 'DEV' };
  return res.json({ ...me, indicators:['Tenant-scoped', role==='READ_ONLY_OBSERVER'?'Read-only access':''] });
});
router.get('/security/roles', (_req,res)=> res.json(['PLATFORM_ADMIN','TENANT_ADMIN','GOVERNANCE_OPERATOR','APPROVER','AUDITOR','EXECUTION_OPERATOR','READ_ONLY_OBSERVER']));
router.get('/security/permissions', (req,res)=>{ const role = roleFrom(req); return res.json({ role, permissions: resolvePermissions(role) }); });

export default router;
