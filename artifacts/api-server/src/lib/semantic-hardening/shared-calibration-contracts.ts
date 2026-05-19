import type { EconomicReplayReference } from './shared-economic-dtos';
export function assertReplayCompatibility(r:EconomicReplayReference):void{ if(!r.replayId||!r.version||!r.timestamp) throw new Error('Invalid replay compatibility'); }
