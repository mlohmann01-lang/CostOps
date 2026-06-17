import type { RawProductionRecord } from "../production-connector-types";
import { normalisedFail, normalisedPass, normalisedWarn } from "../production-connector-normalisers";
export function normaliseERPRecord(connectorKey: string, record: RawProductionRecord) { if (record.kind === "invoice") return normalisedPass(connectorKey, record, "FINANCIAL_INVOICE", { id: record.payload.id, vendorId: record.payload.vendorId, amount: record.payload.amount, currency: record.payload.currency });
  if (record.kind === "purchaseOrder") return normalisedPass(connectorKey, record, "FINANCIAL_PURCHASE_ORDER", { id: record.payload.id, vendorId: record.payload.vendorId, amount: record.payload.amount, currency: record.payload.currency });
  if (record.kind === "vendorSpend") return normalisedPass(connectorKey, record, "FINANCIAL_VENDOR_SPEND", { id: record.payload.id, vendorId: record.payload.vendorId, amount: record.payload.amount, currency: record.payload.currency });
  if (record.kind === "costCentre") return normalisedPass(connectorKey, record, "FINANCIAL_COST_CENTRE", { id: record.payload.id, name: record.payload.name });
  return normalisedFail(connectorKey, record, "UNSUPPORTED_RECORD_KIND", `Unsupported erp record kind: ${record.kind}`); }
