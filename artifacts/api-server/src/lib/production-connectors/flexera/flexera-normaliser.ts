import type { RawProductionRecord } from "../production-connector-types";
import { normalisedFail, normalisedPass, normalisedWarn } from "../production-connector-normalisers";
export function normaliseFlexeraRecord(connectorKey: string, record: RawProductionRecord) { if (record.kind === "contract") return normalisedPass(connectorKey, record, "TECHNOLOGY_CONTRACT", { id: record.payload.id, vendorName: record.payload.vendorName, productName: record.payload.productName, renewalDate: record.payload.renewalDate });
  if (record.kind === "entitlement") return normalisedPass(connectorKey, record, "TECHNOLOGY_ENTITLEMENT", { id: record.payload.id, productName: record.payload.productName, quantity: record.payload.quantity });
  if (record.kind === "renewal") return normalisedPass(connectorKey, record, "COMMERCIAL_RENEWAL", { id: record.payload.id, contractId: record.payload.contractId, renewalDate: record.payload.renewalDate });
  return normalisedFail(connectorKey, record, "UNSUPPORTED_RECORD_KIND", `Unsupported flexera record kind: ${record.kind}`); }
