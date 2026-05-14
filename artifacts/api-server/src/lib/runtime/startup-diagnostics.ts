import { featureFlags } from "../config/feature-flags";
import { validateEnv } from "../config/env";
export function startupDiagnostics(){ const env=validateEnv(); const flags=featureFlags(); const disabled=Object.entries(flags).filter(([,v])=>!v).map(([k])=>k); return { startupWarnings: env.warnings, disabledFeatures: disabled, missingOptionalConfigs: [] as string[] }; }
