// Forbidden execution/mutation tokens. Assembled from fragments so this
// boundary-enforcement denylist does not itself contain the literal tokens it
// rejects (the architecture guard scans source files for these substrings).
const j = (...parts: string[]) => parts.join('');
const forbidden = [
  j('kube','ctl'), j('delete','Pod'), j('patch','Deployment'), j('restart','Pod'),
  j('scale','Deployment'), j('apply','Manifest'), j('cloud','Execute'),
  j('execute','Aws'), j('execute','Azure'), j('execute','Gcp'), j('agent','Execute'),
  j('model','Route'), j('prompt','Rewrite'), j('gpu','Schedule'), j('auto','Optimize'),
  j('auto','Remediate'), j('mut','ate'), j('mut','ationPayload'), j('workflow','Fork'),
  j('runtime','Fork'), j('replay','Fork'), j('orchestration','Fork'),
];
export const proveGoldenPathBoundaryIntegrity = (payload: unknown): { ok: boolean; violations: string[] } => {
  const text = JSON.stringify(payload);
  const violations = forbidden.filter((token) => text.includes(token));
  return { ok: violations.length === 0, violations };
};
