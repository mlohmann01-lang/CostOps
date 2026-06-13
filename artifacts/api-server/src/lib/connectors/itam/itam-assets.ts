export type ItamAsset = {
  id: string;
  tenantId: string;
  assetType: "SOFTWARE" | "HARDWARE" | "CONTRACT" | "LICENSE" | "CAPABILITY";
  vendor: string;
  product: string;
  providerId?: string;
  sourceSystem?: "FLEXERA" | "SERVICENOW_SAM" | "SNOW" | "MANUAL" | "OTHER";
  owner?: string;
  costCentre?: string;
  businessUnit?: string;
  utilisationScore?: number;
  annualCost?: number;
  monthlyCost?: number;
  renewalDate?: string;
  status: "ACTIVE" | "RECLAIMED" | "RETIRED" | "ORPHANED" | "UNDER_REVIEW" | "CONSOLIDATED";
  createdAt: string;
  updatedAt: string;
};

const store = new Map<string, ItamAsset>();
const key = (tenantId: string, id: string) => `${tenantId}:${id}`;
const now = () => new Date().toISOString();

function genId() { return `itam_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`; }

export function createItamAsset(input: Omit<ItamAsset, "id" | "createdAt" | "updatedAt"> & { id?: string }): ItamAsset {
  const ts = now();
  const asset: ItamAsset = { ...input, id: input.id ?? genId(), createdAt: ts, updatedAt: ts };
  store.set(key(asset.tenantId, asset.id), asset);
  return asset;
}

export function getItamAsset(tenantId: string, id: string): ItamAsset | null {
  return store.get(key(tenantId, id)) ?? null;
}

export function listItamAssets(tenantId: string): ItamAsset[] {
  return Array.from(store.values()).filter((a) => a.tenantId === tenantId);
}

export function updateItamAsset(tenantId: string, id: string, patch: Partial<ItamAsset>): ItamAsset {
  const existing = store.get(key(tenantId, id));
  if (!existing) throw new Error("ITAM_ASSET_NOT_FOUND");
  const updated = { ...existing, ...patch, tenantId, id, updatedAt: now() };
  store.set(key(tenantId, id), updated);
  return updated;
}

export function clearItamAssets() { store.clear(); }
