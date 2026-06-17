import type { RawProductionRecord } from "../production-connector-types";
import { normalisedFail, normalisedPass, normalisedWarn } from "../production-connector-normalisers";
export function normaliseM365Record(connectorKey: string, record: RawProductionRecord) { if (record.kind === "user") return normalisedPass(connectorKey, record, "OWNERSHIP_USER", { id: record.payload.id, email: record.payload.userPrincipalName, displayName: record.payload.displayName, department: record.payload.department });
  if (record.kind === "sku") return normalisedPass(connectorKey, record, "TECHNOLOGY_ENTITLEMENT", { id: record.payload.skuId, skuPartNumber: record.payload.skuPartNumber, quantity: record.payload.prepaidUnits, consumedUnits: record.payload.consumedUnits });
  if (record.kind === "usage") return normalisedPass(connectorKey, record, "USAGE_SIGNAL", { id: record.id, principal: record.payload.userPrincipalName, product: record.payload.product, activeDays: record.payload.activeDays });
  if (record.kind === "copilotUsage") return normalisedWarn(connectorKey, record, "USAGE_SIGNAL", { id: record.id, status: "NOT_AVAILABLE", reason: record.payload.reason }, "COPILOT_NOT_AVAILABLE", "tenant/API does not expose Copilot usage endpoint");
  return normalisedFail(connectorKey, record, "UNSUPPORTED_RECORD_KIND", `Unsupported m365 record kind: ${record.kind}`); }
