import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2).filter((a) => a !== '--');
const pattern = args[0] ?? '';
const testsDir = resolve(import.meta.dirname, '../src/tests');
const distDir = resolve(import.meta.dirname, '../dist/tests');

export const dbIntegrationTests = new Set([
  'approval-workflow.test.ts',
  'approval-workflow-execution-request.test.ts',
  'connector-readiness-persistence.test.ts',
  'database-tenant-isolation-live-integration.test.ts',
  'live-tenant-readiness-persistence.test.ts',
  'm365-beta-e2e-fixture.test.ts',
  'outcome-finance-reconciliation-persistence.test.ts',
]);

const allTests = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts'));
const patternVariants = pattern ? [pattern, pattern.replace(/s$/, ''), pattern + 's'] : [];
const matchingBeforeDbGuard = pattern ? allTests.filter((f) => patternVariants.some((p) => f.includes(p))) : allTests;
const runDbIntegration = process.env.RUN_DB_INTEGRATION_TESTS === 'true';
const matching = matchingBeforeDbGuard.filter((file) => runDbIntegration || !dbIntegrationTests.has(file));
const skippedDbDuringRun = matchingBeforeDbGuard.filter((file) => !runDbIntegration && dbIntegrationTests.has(file));
for (const file of skippedDbDuringRun) console.log(`Skipped DB integration test: RUN_DB_INTEGRATION_TESTS not set (${file})`);

if (matching.length === 0) {
  if (skippedDbDuringRun.length > 0) process.exit(0);
  console.error(`No test files matching pattern: "${pattern}"`);
  process.exit(1);
}

console.log(`Running ${matching.length} test file(s) matching "${pattern}":`);
for (const f of matching) console.log(`  ${f}`);

let failed = 0;
const runnableOutfiles = [];
for (const file of matching) {
  const entryPoint = join(testsDir, file);
  const outfile = join(distDir, file.replace('.ts', '.bundle.test.cjs'));
  try {
    await build({ entryPoints: [entryPoint], bundle: true, platform: 'node', format: 'cjs', sourcemap: false, outfile, define: { 'import.meta.url': JSON.stringify(pathToFileURL(entryPoint).href) } });
  } catch (e) {
    console.error(`Build failed for ${file}:`, e.message);
    failed++;
    continue;
  }
  const bundled = readFileSync(outfile, 'utf8');
  const requiresDatabase = bundled.includes('DATABASE_URL must be set. Did you forget to provision a database?') || dbIntegrationTests.has(file);
  if (requiresDatabase && !runDbIntegration) {
    console.log(`Skipped DB integration test: RUN_DB_INTEGRATION_TESTS not set (${file})`);
    skippedDbDuringRun.push(file);
    continue;
  }
  runnableOutfiles.push(outfile);
}

const childEnv = { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'test' };
if (runDbIntegration && !childEnv.DATABASE_URL) childEnv.DATABASE_URL = 'postgres://localhost:5432/test';
for (const outfile of runnableOutfiles) {
  const result = spawnSync(process.execPath, ['--test', outfile], { stdio: 'inherit', env: childEnv });
  if ((result.status ?? 1) !== 0) failed++;
}

const uniqueSkippedDb = [...new Set(skippedDbDuringRun)].sort();
if (uniqueSkippedDb.length > 0) console.log(`DB integration tests skipped (${uniqueSkippedDb.length}): ${uniqueSkippedDb.join(', ')}`);
if (failed > 0) {
  console.error(`\n${failed} test file(s) failed.`);
  process.exit(1);
}
process.exit(0);
