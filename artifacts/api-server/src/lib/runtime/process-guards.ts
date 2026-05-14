export function assertNoSecretsInLogs(message: string){ if(/(secret|token|password)/i.test(message)) throw new Error("SENSITIVE_LOG_CONTENT"); }
