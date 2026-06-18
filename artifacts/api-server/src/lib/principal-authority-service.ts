import { db, principalActionEventsTable, principalAuthoritiesTable, principalsTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export type PrincipalType = "HUMAN" | "SERVICE_ACCOUNT" | "SYSTEM" | "AUTOMATION" | "AGENT";
export type AuthorityType = "REQUESTER" | "APPROVER" | "EXECUTOR" | "OWNER" | "AUDITOR" | "SYSTEM_ACTOR";
export type ScopeType = "TENANT" | "CONNECTOR" | "ASSET" | "ACTION_TYPE" | "POLICY";

export function inferPrincipalType(input: { email?: string | null; externalId?: string | null; displayName?: string | null; sourceSystem?: string | null }): PrincipalType {
  const value = `${input.email ?? ""} ${input.externalId ?? ""} ${input.displayName ?? ""} ${input.sourceSystem ?? ""}`.toLowerCase();
  if (value.includes("agent")) return "AGENT";
  if (value.includes("automation") || value.includes("workflow") || value.includes("job")) return "AUTOMATION";
  if (value === "system" || value.includes("system")) return "SYSTEM";
  if (value.includes("service") || value.includes("svc") || value.includes("connector")) return "SERVICE_ACCOUNT";
  return "HUMAN";
}

export class PrincipalAuthorityService {
  constructor(private readonly store = db) {}
  async resolvePrincipal(input: { tenantId: string; email?: string | null; externalId?: string | null; displayName?: string | null; sourceSystem?: string | null; principalType?: PrincipalType; status?: "ACTIVE" | "INACTIVE" | "UNKNOWN" }) {
    const email = input.email?.trim().toLowerCase() || null;
    const externalId = input.externalId?.trim() || null;
    if (!email && !externalId && !input.displayName) return null;
    const clauses = [email ? eq(principalsTable.email, email) : undefined, externalId ? eq(principalsTable.externalId, externalId) : undefined].filter(Boolean) as any[];
    if (clauses.length) {
      const [existing] = await this.store.select().from(principalsTable).where(and(eq(principalsTable.tenantId, input.tenantId), clauses.length === 1 ? clauses[0] : or(...clauses))).limit(1);
      if (existing) return existing;
    }
    const [created] = await this.store.insert(principalsTable).values({ id: id("principal"), tenantId: input.tenantId, principalType: input.principalType ?? inferPrincipalType({ ...input, email, externalId }), displayName: input.displayName ?? email ?? externalId ?? "Unknown principal", email, externalId, sourceSystem: input.sourceSystem ?? null, status: input.status ?? "ACTIVE" }).returning();
    return created;
  }
  async grantAuthority(input: { tenantId: string; principalId: string; authorityType: AuthorityType; scopeType: ScopeType; scopeId?: string | null; grantedByPrincipalId?: string | null; grantedAt?: Date; expiresAt?: Date | null; status?: "ACTIVE" | "EXPIRED" | "REVOKED" }) {
    const [row] = await this.store.insert(principalAuthoritiesTable).values({ id: id("authority"), ...input, scopeId: input.scopeId ?? null, grantedByPrincipalId: input.grantedByPrincipalId ?? null, grantedAt: input.grantedAt ?? new Date(), expiresAt: input.expiresAt ?? null, status: input.status ?? "ACTIVE" }).returning();
    return row;
  }
  listAuthorities(tenantId: string, principalId: string) { return this.store.select().from(principalAuthoritiesTable).where(and(eq(principalAuthoritiesTable.tenantId, tenantId), eq(principalAuthoritiesTable.principalId, principalId))); }
  async recordActionEvent(input: { tenantId: string; principalId: string; actionContextType: string; actionContextId: string; role: string; timestamp?: Date; metadata?: Record<string, unknown> }) {
    const [row] = await this.store.insert(principalActionEventsTable).values({ id: id("pae"), ...input, timestamp: input.timestamp ?? new Date(), metadata: input.metadata ?? {} }).returning();
    return row;
  }
  listActionEvents(tenantId: string, principalId: string) { return this.store.select().from(principalActionEventsTable).where(and(eq(principalActionEventsTable.tenantId, tenantId), eq(principalActionEventsTable.principalId, principalId))); }
  listPrincipals(tenantId: string) { return this.store.select().from(principalsTable).where(eq(principalsTable.tenantId, tenantId)); }
  getPrincipal(tenantId: string, principalId: string) { return this.store.select().from(principalsTable).where(and(eq(principalsTable.tenantId, tenantId), eq(principalsTable.id, principalId))).limit(1).then((r) => r[0] ?? null); }
}
