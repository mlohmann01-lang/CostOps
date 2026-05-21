import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig, assertProductionConfigSafe, getConfigSummary } from '../lib/config/production-config-validator';

test('valid development config passes', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://localhost/test', nodeEnv: 'development' });
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('missing DATABASE_URL always fails', () => {
  const result = validateProductionConfig({ nodeEnv: 'development' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('DATABASE_URL')));
});

test('production with default tenant fallback fails closed', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', defaultTenantFallback: 'true', jwtSecret: 'x'.repeat(32), allowedOrigins: 'https://app.example.com' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('FAIL_CLOSED') && e.includes('fallback')));
  assert.equal(result.failClosed, true);
});

test('production with live mutation and no auth fails closed', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', liveMutationEnabled: 'true', authRequired: 'false', jwtSecret: 'x'.repeat(32), allowedOrigins: 'https://app.example.com' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Live mutation') && e.includes('auth')));
});

test('production with demo mode fails closed', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', demoMode: 'true', jwtSecret: 'x'.repeat(32), allowedOrigins: 'https://app.example.com' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Demo mode')));
});

test('production with demo fixtures fails closed', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', demoFixturesEnabled: 'true', jwtSecret: 'x'.repeat(32), allowedOrigins: 'https://app.example.com' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('fixtures')));
});

test('production with preview mode fails closed', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', previewMode: 'true', jwtSecret: 'x'.repeat(32), allowedOrigins: 'https://app.example.com' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('Preview mode')));
});

test('production with wildcard CORS fails closed', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', allowedOrigins: '*', jwtSecret: 'x'.repeat(32) });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('CORS')));
});

test('production with short JWT secret fails closed', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', jwtSecret: 'short', allowedOrigins: 'https://app.example.com' });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('JWT_SECRET')));
});

test('assertProductionConfigSafe throws on invalid config', () => {
  assert.throws(() => assertProductionConfigSafe({ databaseUrl: undefined, nodeEnv: 'production' }), /PRODUCTION_CONFIG_INVALID/);
});

test('assertProductionConfigSafe does not throw on valid dev config', () => {
  assert.doesNotThrow(() => assertProductionConfigSafe({ databaseUrl: 'postgres://localhost/test', nodeEnv: 'development' }));
});

test('getConfigSummary masks database URL', () => {
  const summary = getConfigSummary({ databaseUrl: 'postgres://localhost/test', nodeEnv: 'development' });
  assert.equal(summary.databaseUrl, 'SET');
  assert.equal(summary.nodeEnv, 'development');
});

test('getConfigSummary shows MISSING for absent DB URL', () => {
  const summary = getConfigSummary({ nodeEnv: 'development' });
  assert.equal(summary.databaseUrl, 'MISSING');
});

test('production warnings when scheduler not configured', () => {
  const result = validateProductionConfig({ databaseUrl: 'postgres://db', nodeEnv: 'production', jwtSecret: 'x'.repeat(32), allowedOrigins: 'https://app.example.com' });
  assert.ok(result.warnings.some((w) => w.includes('SCHEDULER_ENABLED')));
});
