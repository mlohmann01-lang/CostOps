export const proveGoldenPathLineageIntegrity = (lineage: Array<{ id: string; path: string[] }>): { ok: boolean; missing: string[] } => {
  const missing = lineage.filter((item) => item.path.length < 2).map((item) => item.id);
  return { ok: missing.length === 0, missing };
};
