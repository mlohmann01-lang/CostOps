import { db, metadataMappingEventsTable } from "@workspace/db";

const APP_ALIASES: Array<{ canonicalName: string; canonicalVendor: string; variants: string[] }> = [
  { canonicalName: "Microsoft 365", canonicalVendor: "Microsoft", variants: ["microsoft 365", "m365", "office 365", "o365"] },
  { canonicalName: "Microsoft Entra ID", canonicalVendor: "Microsoft", variants: ["entra", "azure ad", "azure active directory", "microsoft entra"] },
  { canonicalName: "ServiceNow", canonicalVendor: "ServiceNow", variants: ["servicenow", "snow"] },
];

const normalize = (v?: string | null) => (v ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const keyify = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export type AliasResolutionInput = {
  tenantId: string;
  displayName?: string | null;
  vendor?: string | null;
  skuPartNumber?: string | null;
  productName?: string | null;
  sourceSystem: string;
  aliases?: string[];
  persistMappingEvent?: boolean;
};

export async function resolveCanonicalAppIdentity(input: AliasResolutionInput) {
  const candidates = [input.displayName, input.productName, input.skuPartNumber, ...(input.aliases ?? [])].filter(Boolean) as string[];
  const normalized = candidates.map(normalize);
  let canonicalName = input.displayName || input.productName || input.skuPartNumber || "Unknown App";
  let canonicalVendor = input.vendor || "Unknown";
  let confidence = 0.65;

  const match = APP_ALIASES.find((rule) => normalized.some((n) => rule.variants.includes(n)));
  if (match) {
    canonicalName = match.canonicalName;
    canonicalVendor = match.canonicalVendor;
    confidence = 0.92;
  }

  const appKey = keyify(`${canonicalVendor}-${canonicalName}`);
  const aliasSet = Array.from(new Set(candidates.filter((a) => normalize(a) !== normalize(canonicalName))));
  const evidence = { matchedRule: match?.canonicalName ?? null, sourceSystem: input.sourceSystem, candidates };

  if ((match || aliasSet.length > 0) && input.persistMappingEvent !== false) {
    await db.insert(metadataMappingEventsTable).values({
      tenantId: input.tenantId,
      mappingType: "APP_ALIAS",
      sourceValue: candidates[0] ?? canonicalName,
      canonicalValue: canonicalName,
      confidence,
      sourceSystems: [input.sourceSystem],
      evidence,
      status: match ? "AUTO_APPLIED" : "PROPOSED",
    });
  }

  return { appKey, canonicalName, canonicalVendor, aliases: aliasSet, confidence, evidence };
}
