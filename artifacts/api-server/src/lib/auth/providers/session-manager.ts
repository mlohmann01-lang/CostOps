import { randomUUID, createHash } from "node:crypto";
export function issueSessionToken() { return randomUUID(); }
export function hashSessionToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
