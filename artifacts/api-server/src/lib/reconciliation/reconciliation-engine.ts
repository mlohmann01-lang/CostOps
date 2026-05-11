import { db, flexeraEntitlementsTable, m365UsersTable, reconciliationFindingsTable, servicenowAssetsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type FindingType =
  | "IDENTITY_MATCH_CONFIRMED"
  | "IDENTITY_CONFLICT"
  | "ENTITLEMENT_MATCH_CONFIRMED"
  | "ENTITLEMENT_CONFLICT"
  | "OWNERSHIP_MISSING"
  | "CONTRACT_LINK_FOUND"
  | "CONTRACT_LINK_MISSING"
  | "COST_CENTER_MISMATCH";

export type FindingSeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";

type Finding = {
  tenantId: string;
  findingType: FindingType;
  severity: FindingSeverity;
  entityType: string;
  entityKey: string;
  sourcesInvolved: string[];
  evidence: Record<string, unknown>;
  status: "OPEN";
};

function pushFinding(findings: Finding[], finding: Finding) {
  findings.push(finding);
}

export async function runReconciliation(tenantId: string) {
  const [m365, flexera, snAssets] = await Promise.all([
    db.select().from(m365UsersTable).where(eq(m365UsersTable.tenantId, tenantId)),
    db.select().from(flexeraEntitlementsTable).where(eq(flexeraEntitlementsTable.tenantId, tenantId)),
    db.select().from(servicenowAssetsTable).where(eq(servicenowAssetsTable.tenantId, tenantId)),
  ]);

  const findings: Finding[] = [];

  const assetsByUpn = new Map(snAssets.filter((a) => a.userPrincipalName).map((a) => [a.userPrincipalName!.toLowerCase(), a]));
  for (const user of m365) {
    const key = user.userPrincipalName.toLowerCase();
    const matchedAsset = assetsByUpn.get(key);
    if (matchedAsset) {
      pushFinding(findings, {
        tenantId,
        findingType: "IDENTITY_MATCH_CONFIRMED",
        severity: "INFO",
        entityType: "USER",
        entityKey: key,
        sourcesInvolved: ["M365", "SERVICENOW"],
        evidence: { m365User: user.userPrincipalName, assetId: matchedAsset.sourceObjectId },
        status: "OPEN",
      });
      if (!matchedAsset.owner || !matchedAsset.costCenter) {
        pushFinding(findings, {
          tenantId,
          findingType: "OWNERSHIP_MISSING",
          severity: "WARNING",
          entityType: "ASSET",
          entityKey: matchedAsset.sourceObjectId,
          sourcesInvolved: ["SERVICENOW"],
          evidence: { owner: matchedAsset.owner, costCenter: matchedAsset.costCenter, assignedTo: matchedAsset.assignedTo },
          status: "OPEN",
        });
      }
    }
  }

  const entitlementBySku = new Map<string, typeof flexera[number]>();
  for (const e of flexera) {
    const k = (e.skuId ?? e.skuPartNumber ?? "").toLowerCase();
    if (k) entitlementBySku.set(k, e);
  }

  const m365Assignments = new Set<string>();
  for (const user of m365) {
    for (const sku of user.assignedLicenses) {
      const skuKey = String(sku).toLowerCase();
      m365Assignments.add(skuKey);
      if (entitlementBySku.has(skuKey)) {
        pushFinding(findings, {
          tenantId,
          findingType: "ENTITLEMENT_MATCH_CONFIRMED",
          severity: "INFO",
          entityType: "LICENSE",
          entityKey: skuKey,
          sourcesInvolved: ["M365", "FLEXERA"],
          evidence: { sku: skuKey },
          status: "OPEN",
        });
      } else {
        pushFinding(findings, {
          tenantId,
          findingType: "ENTITLEMENT_CONFLICT",
          severity: "HIGH",
          entityType: "LICENSE",
          entityKey: skuKey,
          sourcesInvolved: ["M365", "FLEXERA"],
          evidence: { reason: "M365_ASSIGNED_NO_FLEXERA_ENTITLEMENT" },
          status: "OPEN",
        });
      }
    }
  }

  for (const e of flexera) {
    const key = (e.skuId ?? e.skuPartNumber ?? "").toLowerCase();
    if (key && !m365Assignments.has(key)) {
      pushFinding(findings, {
        tenantId,
        findingType: "ENTITLEMENT_CONFLICT",
        severity: "HIGH",
        entityType: "LICENSE",
        entityKey: key,
        sourcesInvolved: ["FLEXERA", "M365"],
        evidence: { reason: "FLEXERA_ENTITLEMENT_NO_M365_ASSIGNMENT", sourceObjectId: e.sourceObjectId },
        status: "OPEN",
      });
    }
  }

  await db.delete(reconciliationFindingsTable).where(and(eq(reconciliationFindingsTable.tenantId, tenantId), eq(reconciliationFindingsTable.status, "OPEN")));
  if (findings.length > 0) await db.insert(reconciliationFindingsTable).values(findings);

  return { tenantId, findingsCreated: findings.length, findings };
}
