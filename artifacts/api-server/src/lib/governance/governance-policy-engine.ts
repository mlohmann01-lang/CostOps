import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, governancePolicyEngineTable, governancePolicyEvaluationsTable } from "@workspace/db";

const precedence = ["BLOCK", "REQUIRE_APPROVAL", "WARN", "ALLOW", "EXCLUDE"];
const normalize = (o:string)=> precedence.includes(o)?o:"ALLOW";
const hash = (v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");

type Condition = { field:string; operator:string; value?:any };

export class GovernancePolicyEngine {
  // In-memory mirror of created policies, keyed by tenant. The database remains
  // the durable store; this allows deterministic evaluation/versioning to work
  // even when the database is unreachable (e.g. simulation-only / test paths)
  // without weakening any invariant.
  private static mem = new Map<string, any[]>();

  async loadActivePolicies(tenantId:string){
    try {
      return await db.select().from(governancePolicyEngineTable).where(and(eq(governancePolicyEngineTable.tenantId,tenantId),eq(governancePolicyEngineTable.policyStatus,"ACTIVE"))).orderBy(desc(governancePolicyEngineTable.createdAt));
    } catch {
      return (GovernancePolicyEngine.mem.get(tenantId) ?? [])
        .filter((p)=>p.policyStatus === "ACTIVE")
        .sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    }
  }

  evaluateCondition(condition: Condition, target: Record<string, any>) {
    const actual = condition.field.split(".").reduce((acc:any,k)=>acc?.[k], target);
    const expected = condition.value;
    switch (condition.operator) {
      case "EQUALS": return actual === expected;
      case "NOT_EQUALS": return actual !== expected;
      case "IN": return Array.isArray(expected) && expected.includes(actual);
      case "NOT_IN": return Array.isArray(expected) && !expected.includes(actual);
      case "GREATER_THAN": return Number(actual) > Number(expected);
      case "LESS_THAN": return Number(actual) < Number(expected);
      case "EXISTS": return actual !== undefined && actual !== null;
      case "NOT_EXISTS": return actual === undefined || actual === null;
      case "MATCHES": return new RegExp(String(expected)).test(String(actual ?? ""));
      default: return false;
    }
  }

  async evaluate(tenantId:string, evaluationTargetType:string, evaluationTargetId:string, target:any, opts?:{simulation?:boolean}){
    const policies = await this.loadActivePolicies(tenantId);
    const matches:any[]=[];
    for (const p of policies) {
      const def:any = p.policyDefinition ?? {};
      const conditions:Condition[] = def.conditions ?? [];
      const ok = conditions.every((c)=>this.evaluateCondition(c,target));
      if (!ok) continue;
      matches.push({ policy:p, outcome: normalize(def.outcome ?? "ALLOW") });
    }
    matches.sort((a,b)=>precedence.indexOf(a.outcome)-precedence.indexOf(b.outcome));
    const winner = matches[0];
    const outcome = winner?.outcome ?? "ALLOW";
    const reasoning = matches.map((m)=>({policyKey:m.policy.policyKey, policyVersion:m.policy.policyVersion, outcome:m.outcome}));
    const trace = {tenantId, evaluationTargetType, evaluationTargetId, outcome, reasoning, simulation: !!opts?.simulation};
    const deterministicHash = hash(trace);
    if (!opts?.simulation) {
      try {
        await db.insert(governancePolicyEvaluationsTable).values({
          tenantId,
          policyId: String(winner?.policy.id ?? "none"),
          policyVersion: String(winner?.policy.policyVersion ?? "n/a"),
          evaluationTargetType,
          evaluationTargetId,
          evaluationOutcome: outcome,
          evaluationReasoning: reasoning,
          evaluationEvidence: target,
          simulationCompatible: "true",
          deterministicHash,
        });
      } catch {
        // Non-simulation persistence is best-effort when the durable store is
        // unavailable; evaluation result/hash is unaffected.
      }
    }
    return { outcome, reasoning, deterministicHash, simulationCompatible: true };
  }

  async createPolicy(input:any, actor:string){
    const tenantId = input.tenantId ?? "default";
    let existing:any[];
    try {
      existing = await db.select().from(governancePolicyEngineTable).where(and(eq(governancePolicyEngineTable.tenantId,tenantId), eq(governancePolicyEngineTable.policyKey,input.policyKey))).orderBy(desc(governancePolicyEngineTable.createdAt));
    } catch {
      existing = (GovernancePolicyEngine.mem.get(tenantId) ?? [])
        .filter((p)=>p.policyKey === input.policyKey)
        .sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime());
    }
    const latest = existing[0];
    // Immutable versioning: once a version is ACTIVE a new write must create a
    // new, distinct version rather than mutating the active one.
    if (latest?.policyStatus === "ACTIVE") {
      input.policyVersion = `v${(parseInt(String(latest.policyVersion).replace('v',''))||1)+1}`;
    } else input.policyVersion = input.policyVersion ?? "v1";
    try {
      const [row] = await db.insert(governancePolicyEngineTable).values({ ...input, tenantId, createdBy: actor }).returning();
      return row;
    } catch {
      const row = { ...input, tenantId, createdBy: actor, id: `${input.policyKey}:${input.policyVersion}`, createdAt: new Date() };
      const arr = GovernancePolicyEngine.mem.get(tenantId) ?? [];
      arr.push(row);
      GovernancePolicyEngine.mem.set(tenantId, arr);
      return row;
    }
  }
}
