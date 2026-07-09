// Program 14B-R — Remediation 3: fail-closed encryption key resolution.
//
// Previously, all 5 credential stores derived their AES-256-GCM key from
// `process.env.<SOME_KEY> ?? '<hardcoded-literal>'`, so a missing env var in
// production silently fell back to a publicly-known literal baked into the
// source — anyone with the source could decrypt stored credentials.
//
// resolveEncryptionKeySecret() fails closed in production: a missing key
// throws at module load (startup failure), rather than silently substituting
// a fallback. Development/test environments may still use an explicit,
// clearly-isolated fallback secret, gated on NODE_ENV.
export function resolveEncryptionKeySecret(envVarName: string, testOnlyFallback: string): string {
  const fromEnv = process.env[envVarName];
  if (fromEnv) return fromEnv;
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    throw new Error(`${envVarName} must be set in production — refusing to start with a fallback encryption key`);
  }
  return testOnlyFallback;
}
