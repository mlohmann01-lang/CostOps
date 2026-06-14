// Enforces executionLock semantics to prevent concurrent mutations on the same asset.
export const asset_execution_lock = Object.freeze({ deterministic: true, executionLock: true });
