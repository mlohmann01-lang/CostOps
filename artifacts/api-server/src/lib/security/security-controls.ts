import { createHash } from "node:crypto";
const buckets = new Map<string, number[]>();
export function checkExecutionRateLimit(key: string, limit = 10, windowMs = 60_000){ const now=Date.now(); const arr=(buckets.get(key) ?? []).filter((t)=>now-t<windowMs); if(arr.length>=limit) throw new Error("RATE_LIMITED"); arr.push(now); buckets.set(key,arr); }
export function validateSessionExpiry(expiresAt: Date){ if(expiresAt.getTime() < Date.now()) throw new Error("SESSION_EXPIRED"); }
export function approvalTamperHash(payload: unknown){ return createHash("sha256").update(JSON.stringify(payload)).digest("hex"); }
const sensitive=(k:string)=>/(token|secret|authorization|password|credential)/i.test(k);
export function redactSensitiveEvidence(v: any): any { if(Array.isArray(v)) return v.map(redactSensitiveEvidence); if(v && typeof v==='object'){ const out:any={}; for(const [k,val] of Object.entries(v)){ out[k]=sensitive(k)?'REDACTED':redactSensitiveEvidence(val); } return out; } return v; }
