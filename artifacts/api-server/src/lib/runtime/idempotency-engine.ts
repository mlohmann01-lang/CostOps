const seen = new Map<string, Set<string>>();
const key = (tenantId:string, domain:string)=>`${tenantId}:${domain}`;

export function assertIdempotent(tenantId:string, domain:string, idempotencyKey:string) {
  const k = key(tenantId, domain);
  const s = seen.get(k) ?? new Set<string>();
  if (s.has(idempotencyKey)) return { ok:false, reason:'DUPLICATE_BLOCKED' as const };
  s.add(idempotencyKey); seen.set(k,s);
  return { ok:true as const };
}
