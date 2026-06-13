import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { readdirSync } from 'node:fs';

// pnpm passes `--` as a separator; skip it and find the actual pattern
const args = process.argv.slice(2).filter((a) => a !== '--');
const pattern = args[0] ?? '';
const testsDir = resolve(import.meta.dirname, '../src/tests');
const distDir = resolve(import.meta.dirname, '../dist/tests');

const allTests = readdirSync(testsDir).filter((f) => f.endsWith('.test.ts'));
// Support plurals: "connectors" matches "connector-*", "economic-operations" matches as-is
const patternVariants = pattern ? [pattern, pattern.replace(/s$/, ''), pattern + 's'] : [];
const matching = pattern
  ? allTests.filter((f) => patternVariants.some((p) => f.includes(p)))
  : allTests;

if (matching.length === 0) {
  console.error(`No test files matching pattern: "${pattern}"`);
  process.exit(1);
}

console.log(`Running ${matching.length} test file(s) matching "${pattern}":`);
for (const f of matching) console.log(`  ${f}`);

let failed = 0;
for (const file of matching) {
  const entryPoint = join(testsDir, file);
  const outfile = join(distDir, file.replace('.ts', '.bundle.test.cjs'));
  try {
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      sourcemap: false,
      outfile,

    });
  } catch (e) {
    console.error(`Build failed for ${file}:`, e.message);
    failed++;
    continue;
  }

  const result = spawnSync(process.execPath, ['--test', outfile], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/test' },
  });
  if ((result.status ?? 1) !== 0) failed++;
}

if (failed > 0) {
  console.error(`\n${failed} test file(s) failed.`);
  process.exit(1);
}
process.exit(0);
