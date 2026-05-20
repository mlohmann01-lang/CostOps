import type { ActionContract } from "./execution-contract-types"; export const evaluateExecutionSafetyGuard=(c:ActionContract)=>({safe:c.rollbackAvailable&&c.reversibility>=0.5});
