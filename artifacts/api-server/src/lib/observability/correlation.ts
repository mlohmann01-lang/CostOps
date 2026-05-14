import { randomUUID } from "node:crypto";
export function correlationId(existing?: string){ return existing ?? randomUUID(); }
