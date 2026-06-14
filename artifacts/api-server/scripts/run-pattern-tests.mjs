import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { readdirSync, rmSync } from 'node:fs';

// pnpm passes `--` as a separator; skip it and find the actual pattern
const args = process.argv.slice(2).filter((a) => a !== '--');
const pattern = args[0] ?? '';
const testsDir = resolve(import.meta.dirname, '../src/tests');
// Emit bundles INTO the source tests dir so that tests which read sibling
// source files via `new URL('../lib/...', import.meta.url)` resolve against the
// real source tree (../lib === src/lib), not the compiled dist tree.
const distDir = testsDir;

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
  const outfile = join(distDir, file.replace('.ts', '.bundle.test.mjs'));
  try {
    await build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'node',
      format: 'esm',
      sourcemap: false,
      outfile,
      // Bundling to ESM keeps `import.meta.url` meaningful so tests that read
      // sibling source files via `new URL(..., import.meta.url)` resolve correctly.
      // Provide a CJS shim because some bundled deps reference require/__dirname.
      banner: {
        js: [
          "import { createRequire as __createRequire } from 'node:module';",
          "import { fileURLToPath as __fileURLToPath } from 'node:url';",
          "import { dirname as __pathDirname } from 'node:path';",
          'const require = __createRequire(import.meta.url);',
          'const __filename = __fileURLToPath(import.meta.url);',
          'const __dirname = __pathDirname(__filename);',
        ].join('\n'),
      },
    });
  } catch (e) {
    console.error(`Build failed for ${file}:`, e.message);
    failed++;
    continue;
  }

  const result = spawnSync(process.execPath, ['--test', outfile], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? 'test', DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/test' },
  });
  if ((result.status ?? 1) !== 0) failed++;
  // Remove the generated bundle so it never lingers in the source tree.
  try { rmSync(outfile, { force: true }); } catch { /* ignore */ }
}

if (failed > 0) {
  console.error(`\n${failed} test file(s) failed.`);
  process.exit(1);
}
process.exit(0);
