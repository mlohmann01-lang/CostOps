const hitMap = new Map<string, number>();
export function enforceExecutionGuardrail(scope: string, max = 20){ const c=(hitMap.get(scope) ?? 0)+1; hitMap.set(scope,c); if(c>max) throw new Error("EXECUTION_GUARDRAIL_BLOCK"); }
