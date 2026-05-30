import type { StoredVendorChangeEvent, VendorChangeEvent, VendorChangeStatus } from "./vendor-change-types";

const seedChanges: Omit<StoredVendorChangeEvent, "tenantId">[] = [
  { id: "vc-microsoft-copilot-pricing", vendor: "MICROSOFT", category: "LICENSING_CHANGE", title: "Copilot Pricing Update", description: "Microsoft announces Copilot packaging and price changes affecting assigned seats and under-used cohorts.", effectiveDate: "2026-07-01", sourceUrl: "https://www.microsoft.com/licensing/news", impactSeverity: "HIGH", detectedAt: "2026-05-30T08:00:00.000Z", status: "NEW", affectedSpend: 32000, generatedOpportunityCount: 6 },
  { id: "vc-aws-graviton-savings", vendor: "AWS", category: "PRICE_CHANGE", title: "New Graviton Savings Opportunity", description: "AWS releases new Graviton generation with improved price-performance for eligible compute workloads.", effectiveDate: "2026-06-15", sourceUrl: "https://aws.amazon.com/about-aws/whats-new/", impactSeverity: "MEDIUM", detectedAt: "2026-05-30T09:00:00.000Z", status: "ASSESSED", affectedSpend: 48000, generatedOpportunityCount: 4 },
  { id: "vc-snowflake-credit-guidance", vendor: "SNOWFLAKE", category: "FEATURE_CHANGE", title: "Warehouse Credit Optimization Guidance", description: "Snowflake publishes updated warehouse sizing and credit-consumption guidance for bursty analytics workloads.", effectiveDate: "2026-06-05", sourceUrl: "https://docs.snowflake.com/en/release-notes", impactSeverity: "MEDIUM", detectedAt: "2026-05-30T10:00:00.000Z", status: "ASSESSED", affectedSpend: 11000, generatedOpportunityCount: 2 },
  { id: "vc-adobe-retirement", vendor: "ADOBE", category: "RETIREMENT", title: "Legacy Creative Cloud SKU retirement", description: "Adobe retirement notice requires migration planning for legacy Creative Cloud SKUs.", effectiveDate: "2026-09-01", sourceUrl: "https://helpx.adobe.com/enterprise", impactSeverity: "LOW", detectedAt: "2026-05-29T10:00:00.000Z", status: "NEW", affectedSpend: 7000, generatedOpportunityCount: 0 },
];

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export class VendorChangeRepository {
  private static changes = new Map<string, StoredVendorChangeEvent>();

  constructor() { this.ensureTenant("default"); }

  ensureTenant(tenantId: string) {
    for (const change of seedChanges) {
      const key = this.key(tenantId, change.id);
      if (!VendorChangeRepository.changes.has(key)) VendorChangeRepository.changes.set(key, { ...clone(change), tenantId });
    }
  }

  list(tenantId: string) {
    this.ensureTenant(tenantId);
    return Array.from(VendorChangeRepository.changes.values()).filter((event) => event.tenantId === tenantId).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
  }

  highImpact(tenantId: string) { return this.list(tenantId).filter((event) => event.impactSeverity === "HIGH" || event.impactSeverity === "CRITICAL"); }
  get(tenantId: string, id: string) { return this.list(tenantId).find((event) => event.id === id) ?? null; }

  upsert(tenantId: string, event: VendorChangeEvent & Partial<Pick<StoredVendorChangeEvent, "status" | "affectedSpend" | "generatedOpportunityCount">>) {
    const stored: StoredVendorChangeEvent = { ...event, tenantId, status: event.status ?? "NEW", affectedSpend: event.affectedSpend ?? 0, generatedOpportunityCount: event.generatedOpportunityCount ?? 0 };
    VendorChangeRepository.changes.set(this.key(tenantId, event.id), stored);
    return stored;
  }

  setStatus(tenantId: string, id: string, status: VendorChangeStatus) {
    const event = this.get(tenantId, id);
    if (!event) return null;
    const updated = { ...event, status };
    VendorChangeRepository.changes.set(this.key(tenantId, id), updated);
    return updated;
  }

  clearForTests() { VendorChangeRepository.changes.clear(); }
  private key(tenantId: string, id: string) { return `${tenantId}:${id}`; }
}
