export type FlexeraCapability =
  | 'FLEXERA_READ_ENTITLEMENTS'
  | 'FLEXERA_READ_LICENSE_POSITION'
  | 'FLEXERA_READ_PURCHASES'
  | 'FLEXERA_READ_APPLICATION_INVENTORY'
  | 'FLEXERA_READ_USAGE_EXPORT';

export type FlexeraEntitlement = {
  entitlementId: string;
  userPrincipalName: string;
  productName: string;
  skuId: string;
  skuPartNumber: string;
  entitlementQuantity: number;
  consumedQuantity: number;
  monthlyCost: number;
  contractId: string;
};

export type FlexeraValidationResult = {
  tenantId: string;
  correlationId: string;
  matchedEntitlements: FlexeraEntitlementMatch[];
  mismatches: FlexeraEntitlementMismatch[];
  dataTrustBoost: number;
  dataTrustConflict: boolean;
  proofGraphNodes: FlexeraProofNode[];
  summary: { total: number; matched: number; mismatched: number; conflicted: number };
};

export type FlexeraEntitlementMatch = {
  userId: string;
  userPrincipalName: string;
  skuId: string;
  m365Assigned: boolean;
  flexeraAssigned: boolean;
  costPerMonth: number;
  confidence: number;
};

export type FlexeraEntitlementMismatch = {
  userId: string;
  userPrincipalName: string;
  skuId: string;
  mismatchType: 'M365_ASSIGNED_NOT_IN_FLEXERA' | 'FLEXERA_ASSIGNED_NOT_IN_M365' | 'QUANTITY_CONFLICT' | 'COST_CONFLICT';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  details: string;
};

export type FlexeraProofNode = {
  proofId: string;
  proofType: 'FLEXERA_ENTITLEMENT_PROOF' | 'FLEXERA_MISMATCH_PROOF' | 'FLEXERA_CONFIDENCE_PROOF';
  title: string;
  summary: string;
  source: 'flexera';
  confidence: number;
  evidenceHash: string;
};

export type M365LicenseSnapshot = {
  userId: string;
  userPrincipalName: string;
  assignedSkuIds: string[];
};

export class FlexeraEntitlementValidator {
  async validateEntitlements(
    tenantId: string,
    m365Snapshots: M365LicenseSnapshot[],
    flexeraEntitlements: FlexeraEntitlement[],
  ): Promise<FlexeraValidationResult> {
    const correlationId = `flexera-val-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const flexeraByUser = new Map<string, FlexeraEntitlement[]>();
    for (const ent of flexeraEntitlements) {
      const existing = flexeraByUser.get(ent.userPrincipalName) ?? [];
      existing.push(ent);
      flexeraByUser.set(ent.userPrincipalName, existing);
    }

    const matched: FlexeraEntitlementMatch[] = [];
    const mismatches: FlexeraEntitlementMismatch[] = [];

    for (const snap of m365Snapshots) {
      const flexera = flexeraByUser.get(snap.userPrincipalName) ?? [];
      const flexeraSkuIds = new Set(flexera.map((e) => e.skuId.toUpperCase()));

      for (const skuId of snap.assignedSkuIds) {
        const inFlexera = flexeraSkuIds.has(skuId.toUpperCase());
        if (inFlexera) {
          const ent = flexera.find((e) => e.skuId.toUpperCase() === skuId.toUpperCase());
          matched.push({
            userId: snap.userId,
            userPrincipalName: snap.userPrincipalName,
            skuId,
            m365Assigned: true,
            flexeraAssigned: true,
            costPerMonth: ent?.monthlyCost ?? 0,
            confidence: 0.95,
          });
        } else {
          mismatches.push({
            userId: snap.userId,
            userPrincipalName: snap.userPrincipalName,
            skuId,
            mismatchType: 'M365_ASSIGNED_NOT_IN_FLEXERA',
            severity: 'MEDIUM',
            details: `SKU ${skuId} assigned in M365 but not found in Flexera entitlements`,
          });
        }
      }

      for (const ent of flexera) {
        const inM365 = snap.assignedSkuIds.some((s) => s.toUpperCase() === ent.skuId.toUpperCase());
        if (!inM365) {
          mismatches.push({
            userId: snap.userId,
            userPrincipalName: snap.userPrincipalName,
            skuId: ent.skuId,
            mismatchType: 'FLEXERA_ASSIGNED_NOT_IN_M365',
            severity: 'HIGH',
            details: `SKU ${ent.skuId} in Flexera entitlements but not assigned in M365`,
          });
        }
      }
    }

    const total = matched.length + mismatches.length;
    const dataTrustBoost = total > 0 ? matched.length / total * 0.2 : 0;
    const dataTrustConflict = mismatches.some((m) => m.severity === 'HIGH');

    const evidenceHash = Buffer.from(JSON.stringify({ matched: matched.length, mismatches: mismatches.length, tenantId })).toString('base64').slice(0, 32);
    const proofGraphNodes: FlexeraProofNode[] = [
      {
        proofId: `flexera-ent-${correlationId}`,
        proofType: 'FLEXERA_ENTITLEMENT_PROOF',
        title: 'Flexera Entitlement Validation',
        summary: `${matched.length} matched, ${mismatches.length} mismatched across ${m365Snapshots.length} users`,
        source: 'flexera',
        confidence: dataTrustConflict ? 0.5 : 0.9,
        evidenceHash,
      },
    ];

    if (mismatches.length > 0) {
      proofGraphNodes.push({
        proofId: `flexera-mismatch-${correlationId}`,
        proofType: 'FLEXERA_MISMATCH_PROOF',
        title: 'Flexera Entitlement Mismatches',
        summary: `${mismatches.filter((m) => m.severity === 'HIGH').length} high-severity conflicts detected`,
        source: 'flexera',
        confidence: 0.3,
        evidenceHash: `mm-${evidenceHash}`,
      });
    }

    return {
      tenantId,
      correlationId,
      matchedEntitlements: matched,
      mismatches,
      dataTrustBoost,
      dataTrustConflict,
      proofGraphNodes,
      summary: {
        total,
        matched: matched.length,
        mismatched: mismatches.length,
        conflicted: mismatches.filter((m) => m.severity === 'HIGH').length,
      },
    };
  }

  async fetchEntitlements(tenantId: string): Promise<FlexeraEntitlement[]> {
    const mode = process.env.FLEXERA_MODE ?? 'MOCK_CONNECTOR';
    if (mode === 'MOCK_CONNECTOR') {
      return [
        { entitlementId: 'ent-1', userPrincipalName: 'john.smith@contoso.com', productName: 'M365 E5', skuId: 'sku-e5', skuPartNumber: 'E5', entitlementQuantity: 100, consumedQuantity: 89, monthlyCost: 57, contractId: 'ctr-1' },
        { entitlementId: 'ent-2', userPrincipalName: 'jane.doe@contoso.com', productName: 'M365 E3', skuId: 'sku-e3', skuPartNumber: 'E3', entitlementQuantity: 50, consumedQuantity: 44, monthlyCost: 36, contractId: 'ctr-1' },
      ];
    }

    const base = process.env.FLEXERA_BASE_URL;
    if (!base) return [];

    try {
      const res = await fetch(`${base}/api/entitlements?tenantId=${encodeURIComponent(tenantId)}&limit=100`);
      if (!res.ok) throw new Error(`FLEXERA_FETCH_FAILED_${res.status}`);
      const body = await res.json() as { items?: FlexeraEntitlement[] };
      return body.items ?? [];
    } catch {
      return [];
    }
  }

  getReadinessState(): { ready: boolean; capabilities: FlexeraCapability[]; state: string } {
    const mode = process.env.FLEXERA_MODE ?? 'MOCK_CONNECTOR';
    const capabilities: FlexeraCapability[] = ['FLEXERA_READ_ENTITLEMENTS', 'FLEXERA_READ_LICENSE_POSITION', 'FLEXERA_READ_PURCHASES', 'FLEXERA_READ_APPLICATION_INVENTORY', 'FLEXERA_READ_USAGE_EXPORT'];
    return { ready: mode === 'MOCK_CONNECTOR' || Boolean(process.env.FLEXERA_BASE_URL), capabilities, state: mode === 'MOCK_CONNECTOR' ? 'MOCK' : 'LIVE' };
  }
}

export const globalFlexeraValidator = new FlexeraEntitlementValidator();
