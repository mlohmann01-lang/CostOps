export type OwnerInferenceInput = {
  serviceNowOwner?: string | null;
  serviceNowAssignedTo?: string | null;
  contractOwner?: string | null;
  department?: string | null;
  costCenter?: string | null;
  mostCommonUserDepartment?: string | null;
  flexeraMetadata?: Record<string, unknown>;
};

export function inferAppOwner(appContext: OwnerInferenceInput) {
  const warnings: string[] = [];
  const evidence: Record<string, unknown> = { ...appContext };
  if (appContext.serviceNowOwner) return { owner: appContext.serviceNowOwner, confidence: 0.98, source: "SERVICENOW_OWNER", inferred: false, warnings, evidence };
  if (appContext.contractOwner) return { owner: appContext.contractOwner, confidence: 0.9, source: "CONTRACT_OWNER", inferred: false, warnings, evidence };
  if (appContext.costCenter) {
    warnings.push("Owner inferred from cost center");
    return { owner: `${appContext.costCenter} Owner`, confidence: 0.72, source: "COST_CENTER_INFERENCE", inferred: true, warnings, evidence };
  }
  if (appContext.department || appContext.mostCommonUserDepartment) {
    const dept = appContext.department ?? appContext.mostCommonUserDepartment;
    warnings.push("Owner inferred from department");
    return { owner: `${dept} Lead`, confidence: 0.6, source: "DEPARTMENT_INFERENCE", inferred: true, warnings, evidence };
  }
  warnings.push("Unknown owner; readiness blocker required");
  return { owner: null, confidence: 0, source: "UNKNOWN", inferred: true, warnings, evidence };
}
