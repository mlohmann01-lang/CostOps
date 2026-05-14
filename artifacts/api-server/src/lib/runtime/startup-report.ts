import { startupDiagnostics } from "./startup-diagnostics";
import { runtimeHealth } from "./runtime-health";
export function startupReport(){ return { diagnostics: startupDiagnostics(), health: runtimeHealth() }; }
