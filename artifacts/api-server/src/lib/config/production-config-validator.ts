export type ConfigValidationResult = {
  valid: boolean;
  errors: string[];
  warnings: string[];
  failClosed: boolean;
};

export type RuntimeEnvironment = 'development' | 'test' | 'staging' | 'production';

export type ProductionConfig = {
  databaseUrl?: string;
  nodeEnv?: string;
  tenantIsolationEnabled?: string;
  defaultTenantFallback?: string;
  liveMutationEnabled?: string;
  authRequired?: string;
  jwtSecret?: string;
  allowedOrigins?: string;
  demoMode?: string;
  previewMode?: string;
  demoFixturesEnabled?: string;
  schedulerEnabled?: string;
  jobRunnerEnabled?: string;
  webhookUrl?: string;
};

function envToConfig(): ProductionConfig {
  return {
    databaseUrl: process.env['DATABASE_URL'],
    nodeEnv: process.env['NODE_ENV'],
    tenantIsolationEnabled: process.env['TENANT_ISOLATION_ENABLED'],
    defaultTenantFallback: process.env['DEFAULT_TENANT_FALLBACK'],
    liveMutationEnabled: process.env['LIVE_MUTATION_ENABLED'],
    authRequired: process.env['AUTH_REQUIRED'],
    jwtSecret: process.env['JWT_SECRET'],
    allowedOrigins: process.env['ALLOWED_ORIGINS'],
    demoMode: process.env['DEMO_MODE'],
    previewMode: process.env['PREVIEW_MODE'],
    demoFixturesEnabled: process.env['DEMO_FIXTURES_ENABLED'],
    schedulerEnabled: process.env['SCHEDULER_ENABLED'],
    jobRunnerEnabled: process.env['JOB_RUNNER_ENABLED'],
    webhookUrl: process.env['WEBHOOK_URL'],
  };
}

export function validateProductionConfig(config: ProductionConfig = envToConfig()): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const env: RuntimeEnvironment = (config.nodeEnv as RuntimeEnvironment) ?? 'development';
  const isProduction = env === 'production';

  if (!config.databaseUrl) {
    errors.push('DATABASE_URL must be set');
  }

  if (isProduction) {
    if (config.defaultTenantFallback === 'true') {
      errors.push('FAIL_CLOSED: Default tenant fallback is enabled in production — cross-tenant leakage risk');
    }

    if (config.liveMutationEnabled === 'true' && config.authRequired !== 'true') {
      errors.push('FAIL_CLOSED: Live mutation enabled without auth/RBAC enforcement');
    }

    if (config.demoMode === 'true') {
      errors.push('FAIL_CLOSED: Demo mode is enabled in production');
    }

    if (config.demoFixturesEnabled === 'true') {
      errors.push('FAIL_CLOSED: Demo fixtures are enabled in production');
    }

    if (config.previewMode === 'true') {
      errors.push('FAIL_CLOSED: Preview mode is enabled in production');
    }

    if (!config.jwtSecret || config.jwtSecret.length < 32) {
      errors.push('FAIL_CLOSED: JWT_SECRET missing or too short for production');
    }

    if (!config.allowedOrigins || config.allowedOrigins === '*') {
      errors.push('FAIL_CLOSED: Unsafe CORS configuration — ALLOWED_ORIGINS must not be wildcard in production');
    }
  }

  if (!config.schedulerEnabled && isProduction) {
    warnings.push('SCHEDULER_ENABLED is not set — background jobs will not run');
  }

  if (!config.jobRunnerEnabled && isProduction) {
    warnings.push('JOB_RUNNER_ENABLED is not set — job worker will not process queue');
  }

  const failClosed = errors.length > 0;

  return { valid: !failClosed, errors, warnings, failClosed };
}

export function assertProductionConfigSafe(config?: ProductionConfig): void {
  const result = validateProductionConfig(config);
  if (result.failClosed) {
    throw new Error(`PRODUCTION_CONFIG_INVALID:\n${result.errors.join('\n')}`);
  }
}

export function getConfigSummary(config: ProductionConfig = envToConfig()): Record<string, string> {
  return {
    nodeEnv: config.nodeEnv ?? 'unset',
    databaseUrl: config.databaseUrl ? 'SET' : 'MISSING',
    tenantIsolation: config.tenantIsolationEnabled ?? 'unset',
    liveMutation: config.liveMutationEnabled ?? 'false',
    authRequired: config.authRequired ?? 'unset',
    demoMode: config.demoMode ?? 'false',
    schedulerEnabled: config.schedulerEnabled ?? 'false',
    jobRunnerEnabled: config.jobRunnerEnabled ?? 'false',
  };
}
