import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { API_SERVER_TEST_HARNESS_STABLE, runApiServerTestHarnessAudit } from '../lib/test-harness/api-server-test-harness-audit';
import { resolvePackagePath, resolveRepoPath, resolveSourcePath } from './test-harness-paths';

test('path helper resolves repo root, package root, and source paths', () => {
  assert.ok(resolveRepoPath('pnpm-workspace.yaml').endsWith('pnpm-workspace.yaml'));
  assert.ok(resolvePackagePath('package.json').endsWith('artifacts/api-server/package.json'));
  assert.ok(resolveSourcePath('tests', 'test-harness-paths.ts').endsWith('src/tests/test-harness-paths.ts'));
});

test('DB integration guard skips without env var and default command does not force DATABASE_URL', () => {
  const runner = readFileSync(resolvePackagePath('scripts', 'run-pattern-tests.mjs'), 'utf8');
  assert.match(runner, /Skipped DB integration test: RUN_DB_INTEGRATION_TESTS not set/);
  assert.doesNotMatch(runner, /DATABASE_URL: process\.env\.DATABASE_URL \?\?/);
});

test('quarantine metadata and baseline report are parseable', () => {
  const baseline = readFileSync(resolveRepoPath('docs/test-baseline/api-server-test-harness-baseline.md'), 'utf8');
  const quarantine = readFileSync(resolveRepoPath('docs/test-baseline/api-server-quarantined-tests.md'), 'utf8');
  assert.match(baseline, /classification/i);
  assert.match(quarantine, /RUN_DB_INTEGRATION_TESTS=true/);
});

test('API_SERVER_TEST_HARNESS_STABLE audit returns PASS', () => {
  const audit = runApiServerTestHarnessAudit();
  assert.equal(audit.checkKey, API_SERVER_TEST_HARNESS_STABLE);
  assert.equal(audit.status, 'PASS');
});
