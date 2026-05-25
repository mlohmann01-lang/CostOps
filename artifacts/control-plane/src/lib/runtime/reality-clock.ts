export interface RealityClock { now(): number }
export const sessionClock: RealityClock = { now: () => Date.now() }
