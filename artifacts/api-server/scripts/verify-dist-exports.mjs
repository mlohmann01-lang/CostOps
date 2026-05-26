import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const required = [
  'dist/lib/runtime-phase-adapters/discover-phase-adapter.js',
  'dist/lib/operational-graph/types.js',
  'dist/lib/operational-graph/lineage.js',
];

const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error('Missing critical dist exports:');
  for (const m of missing) console.error(` - ${m}`);
  process.exit(1);
}
console.log('dist export verification passed');
