const forbidden = ['kubectl','deletePod','patchDeployment','restartPod','scaleDeployment','applyManifest','cloudExecute','executeAws','executeAzure','executeGcp','agentExecute','modelRoute','promptRewrite','gpuSchedule','autoOptimize','autoRemediate','mutate','mutationPayload','workflowFork','runtimeFork','replayFork','orchestrationFork'];
export const proveGoldenPathBoundaryIntegrity = (payload: unknown): { ok: boolean; violations: string[] } => {
  const text = JSON.stringify(payload);
  const violations = forbidden.filter((token) => text.includes(token));
  return { ok: violations.length === 0, violations };
};
