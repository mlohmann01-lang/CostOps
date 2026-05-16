export function maskSecret(value: string | null | undefined): string {
  if (!value) return "";
  const suffix = value.slice(-4);
  return `${"*".repeat(Math.max(8, value.length - 4))}${suffix}`;
}
