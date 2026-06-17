import type { RawProductionRecord } from "../production-connector-types";
import { normalisedFail, normalisedPass, normalisedWarn } from "../production-connector-normalisers";
export function normaliseServiceNowRecord(connectorKey: string, record: RawProductionRecord) { if (record.kind === "businessApp") return normalisedPass(connectorKey, record, "APPLICATION_GRAPH_NODE", { id: record.payload.id, name: record.payload.name, ownerId: record.payload.ownerId });
  if (record.kind === "owner") return normalisedPass(connectorKey, record, "OWNERSHIP_ASSIGNMENT", { id: record.id, appId: record.payload.appId, ownerId: record.payload.ownerId, role: record.payload.role });
  if (record.kind === "cmdbRelation") return normalisedPass(connectorKey, record, "GRAPH_EDGE", { id: record.id, graphEdges: [{ type: record.payload.relationType, from: String(record.payload.from), to: String(record.payload.to) }] });
  return normalisedFail(connectorKey, record, "UNSUPPORTED_RECORD_KIND", `Unsupported servicenow record kind: ${record.kind}`); }
