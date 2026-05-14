import { createHash } from "node:crypto";
export function auditHash(prevHash: string, payload: unknown){ return createHash("sha256").update(prevHash + JSON.stringify(payload)).digest("hex"); }
