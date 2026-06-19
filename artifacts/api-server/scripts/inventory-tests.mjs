import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const testsDir = resolve(import.meta.dirname, '../src/tests');
const distDir = resolve(import.meta.dirname, '../dist/tests');
export const dbIntegrationTests = new Set([
  'approval-workflow.test.ts',
  'approval-workflow-execution-request.test.ts',
  'connector-readiness-persistence.test.ts',
  'live-tenant-readiness-persistence.test.ts',
  'm365-beta-e2e-fixture.test.ts',
  'outcome-finance-reconciliation-persistence.test.ts',
]);
const allTests = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts')).sort();
const runDbIntegration = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const childEnv = { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'test' };
if (runDbIntegration && !childEnv.DATABASE_URL) childEnv.DATABASE_URL = 'postgres://localhost:5432/test';

const results = [];
for (const file of allTests) {
  const entryPoint = join(testsDir, file);
  const outfile = join(distDir, file.replace('.ts', '.bundle.test.cjs'));
  try {
    await build({ entryPoints: [entryPoint], bundle: true, platform: 'node', format: 'cjs', sourcemap: false, outfile, define: { 'import.meta.url': JSON.stringify(pathToFileURL(entryPoint).href) } });
  } catch (e) {
    results.push({ file, status: 'BUILD_FAILED', detail: e.message });
    console.log(`BUILD_FAILED\t${file}`);
    continue;
  }
  const bundled = readFileSync(outfile, 'utf8');
  const requiresDatabase = bundled.includes('DATABASE_URL must be set. Did you forget to provision a database?') || dbIntegrationTests.has(file);
  if (requiresDatabase && !runDbIntegration) {
    results.push({ file, status: 'SKIPPED_DB' });
    console.log(`SKIPPED_DB\t${file}`);
    continue;
  }
  const result = spawnSync(process.execPath, ['--test', outfile], { encoding: 'utf8', env: childEnv });
  const ok = (result.status ?? 1) === 0;
  results.push({ file, status: ok ? 'PASS' : 'FAIL', stdout: result.stdout, stderr: result.stderr, requiresDatabase });
  console.log(`${ok ? 'PASS' : 'FAIL'}\t${file}${requiresDatabase ? '\t[DB]' : ''}`);
}

const summary = {
  total: results.length,
  pass: results.filter(r=>r.status==='PASS').length,
  fail: results.filter(r=>r.status==='FAIL').length,
  skippedDb: results.filter(r=>r.status==='SKIPPED_DB').length,
  buildFailed: results.filter(r=>r.status==='BUILD_FAILED').length,
};
console.log(JSON.stringify(summary));
import { writeFileSync } from 'node:fs';
writeFileSync('/tmp/inventory-results.json', JSON.stringify(results, null, 2));
