import { runDryExecution } from "./dry-run-execution-engine"; export const computeExecutionSimulationReport=(i:any)=>({dry:runDryExecution(i),impact:i.impact});
