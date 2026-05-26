export function planRollbackForRemoveLicense(targetEntityId: string, evidencePointers: string[]) {
  return {
    type: "RESTORE_LICENSE_ASSIGNMENTS",
    targetEntityId,
    snapshotEvidence: evidencePointers,
    steps: ["Capture assigned licenses snapshot", "Reapply removed license SKU assignments"],
  };
}
