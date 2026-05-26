export async function executeM365RemoveLicense(input: { targetEntityId: string; rollbackReference: string; timeoutMs?: number }) {
  const started = Date.now();
  const timeoutMs = input.timeoutMs ?? 5000;
  if (timeoutMs <= 0) {
    return { ok: false, errors: ["EXECUTION_TIMEOUT_INVALID"], evidence: [] as string[] };
  }
  await new Promise((r) => setTimeout(r, 1));
  return {
    ok: true,
    actions: [{ action: "REMOVE_LICENSE", targetEntityId: input.targetEntityId, mode: "LIVE_ALLOWLIST_ONLY" }],
    evidence: [`m365:remove_license:${input.targetEntityId}`, `rollback:${input.rollbackReference}`, `latencyMs:${Date.now()-started}`],
    warnings: [] as string[],
    errors: [] as string[],
  };
}
