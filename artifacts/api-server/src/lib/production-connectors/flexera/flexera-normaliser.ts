import type { RawProductionRecord } from '../production-connector-types';
import { normalisedFail, normalisedPass } from '../production-connector-normalisers';
export function normaliseFlexeraRecord(connectorKey: string, record: RawProductionRecord) {
  if (record.kind === 'application') return normalisedPass(connectorKey, record, 'PORTFOLIO_APPLICATION', record.payload);
  if (record.kind === 'asset') return normalisedPass(connectorKey, record, 'PORTFOLIO_ASSET', record.payload);
  if (record.kind === 'vendor') return normalisedPass(connectorKey, record, 'TECHNOLOGY_VENDOR', record.payload);
  if (record.kind === 'contract') return normalisedPass(connectorKey, record, 'TECHNOLOGY_CONTRACT', record.payload);
  if (record.kind === 'entitlement') return normalisedPass(connectorKey, record, 'TECHNOLOGY_ENTITLEMENT', record.payload);
  if (record.kind === 'renewal') return normalisedPass(connectorKey, record, 'COMMERCIAL_RENEWAL', record.payload);
  if (record.kind === 'consumption') return normalisedPass(connectorKey, record, 'CONSUMPTION_RECORD', record.payload);
  return normalisedFail(connectorKey, record, 'UNSUPPORTED_RECORD_KIND', `Unsupported flexera record kind: ${record.kind}`);
}
