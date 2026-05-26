import { randomBytes } from "node:crypto";

export type RuntimeEnv = "development" | "staging" | "production";

export type RuntimeBootstrapResult = {
  env: RuntimeEnv;
  warnings: string[];
  errors: string[];
  allowedOrigins: string[];
  jwtSecret: string;
};

const DEV_JWT_PREFIX = "dev-local-";

export function getRuntimeEnv(): RuntimeEnv {
  const raw = (process.env["RUNTIME_ENV"] ?? process.env["NODE_ENV"] ?? "development").toLowerCase();
  if (raw === "prod" || raw === "production") return "production";
  if (raw === "stage" || raw === "staging") return "staging";
  return "development";
}

export function parseAllowedOrigins(raw: string | undefined, env: RuntimeEnv): { origins: string[]; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!raw || raw.trim() === "") {
    if (env === "production") {
      errors.push("ALLOWED_ORIGINS must be set in production");
      return { origins: [], errors, warnings };
    }
    warnings.push("ALLOWED_ORIGINS is unset; defaulting to localhost origins");
    return { origins: ["http://localhost:3000", "http://localhost:5173"], errors, warnings };
  }
  const origins = raw.split(",").map((v) => v.trim()).filter(Boolean);
  if (origins.includes("*")) {
    if (env === "production") errors.push("ALLOWED_ORIGINS cannot include wildcard '*' in production");
    else warnings.push("Wildcard ALLOWED_ORIGINS is not recommended outside local development");
  }
  for (const origin of origins) {
    if (origin !== "*" && !/^https?:\/\/[^/\s]+$/i.test(origin)) {
      errors.push(`ALLOWED_ORIGINS contains invalid origin format: ${origin}`);
    }
  }
  return { origins, errors, warnings };
}

export function resolveJwtSecret(env: RuntimeEnv): { secret: string; errors: string[]; warnings: string[] } {
  const secret = process.env["JWT_SECRET"]?.trim();
  const errors: string[] = [];
  const warnings: string[] = [];
  if (secret && secret.length >= 32) return { secret, errors, warnings };

  if (env === "production") {
    errors.push("JWT_SECRET is required in production and must be at least 32 characters");
    return { secret: "", errors, warnings };
  }

  if (secret && secret.length < 32) {
    warnings.push("JWT_SECRET is shorter than 32 chars; generating development fallback");
  } else {
    warnings.push("JWT_SECRET is missing; generating development fallback");
  }
  const generated = `${DEV_JWT_PREFIX}${randomBytes(24).toString("hex")}`;
  process.env["JWT_SECRET"] = generated;
  return { secret: generated, errors, warnings };
}

export function validateEnv(): RuntimeBootstrapResult {
  const env = getRuntimeEnv();
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!process.env["DATABASE_URL"]) {
    if (env === "production") errors.push("DATABASE_URL must be set in production");
    else warnings.push("DATABASE_URL is missing; local startup may fail where DB access is required");
  }

  const originValidation = parseAllowedOrigins(process.env["ALLOWED_ORIGINS"], env);
  warnings.push(...originValidation.warnings);
  errors.push(...originValidation.errors);

  const jwt = resolveJwtSecret(env);
  warnings.push(...jwt.warnings);
  errors.push(...jwt.errors);

  process.env["NODE_ENV"] = env;
  process.env["RUNTIME_ENV"] = env;

  return {
    env,
    warnings,
    errors,
    allowedOrigins: originValidation.origins,
    jwtSecret: jwt.secret,
  };
}
