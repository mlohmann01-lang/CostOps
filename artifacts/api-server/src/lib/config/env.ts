export type RuntimeEnv = "DEV"|"STAGING"|"PROD";
export function getRuntimeEnv(): RuntimeEnv { return (process.env.RUNTIME_ENV as RuntimeEnv) ?? "DEV"; }
export function validateEnv(){ const env=getRuntimeEnv(); const required=["DATABASE_URL"]; if(env==="PROD") for(const key of required){ if(!process.env[key]) throw new Error(`Missing env ${key}`); } return { env, warnings: env==="DEV"? ["DEV mode: non-critical env missing allowed"]:[] }; }
