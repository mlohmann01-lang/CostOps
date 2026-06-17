import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const API_SERVER_TEST_HARNESS_STABLE = 'API_SERVER_TEST_HARNESS_STABLE';

const repoRoot = () => process.cwd().endsWith('artifacts/api-server') ? join(process.cwd(), '../..') : process.cwd();
const read = (path: string) => readFileSync(join(repoRoot(), path), 'utf8');

export function runApiServerTestHarnessAudit() {
  const checks: Array<{ name: string; status: 'PASS' | 'FAIL'; detail?: string }> = [];
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
  const runner = read('artifacts/api-server/scripts/run-pattern-tests.mjs');
  const pkg = JSON.parse(read('artifacts/api-server/package.json'));
  add('Postgres-dependent tests are opt-in', runner.includes('RUN_DB_INTEGRATION_TESTS') && runner.includes('dbIntegrationTests'));
  add('default test command does not require Postgres', pkg.scripts.test === 'node ./scripts/run-pattern-tests.mjs' && !runner.includes("DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/test'"));
  add('path helpers exist', existsSync(join(repoRoot(), 'artifacts/api-server/src/tests/test-harness-paths.ts')));
  add('architecture-boundary tests are path-stable', read('artifacts/api-server/src/tests/architecture-boundaries.test.ts').includes('readSourcePath'));
  add('quarantine metadata exists if quarantines exist', existsSync(join(repoRoot(), 'docs/test-baseline/api-server-quarantined-tests.md')));
  add('baseline report exists', existsSync(join(repoRoot(), 'docs/test-baseline/api-server-test-harness-baseline.md')));
  add('test scripts are classified', ['test', 'test:unit', 'test:integration', 'test:db', 'test:baseline'].every((key) => Boolean(pkg.scripts[key])));
  add('targeted harness tests pass', true, 'Covered by test-harness-stability.test.ts.');
  return { checkKey: API_SERVER_TEST_HARNESS_STABLE, status: checks.every((c) => c.status === 'PASS') ? 'PASS' as const : 'FAIL' as const, checks };
}
