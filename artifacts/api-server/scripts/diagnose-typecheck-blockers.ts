import { spawnSync } from 'node:child_process';

const run = spawnSync('pnpm', ['--filter', '@workspace/api-server', 'typecheck'], { encoding: 'utf8' });
const output = `${run.stdout}\n${run.stderr}`;
const lines = output.split('\n').filter((l) => l.includes('error TS'));

const buckets: Record<string, string[]> = {
  'build-order/declaration issues': [],
  'implicit any': [],
  'missing generated types': [],
  'stale imports': [],
  'schema/type mismatch': [],
  'unrelated legacy area': [],
};

for (const line of lines) {
  if (line.includes('TS6305')) buckets['build-order/declaration issues'].push(line);
  else if (line.includes('TS7006') || line.includes('TS7031')) buckets['implicit any'].push(line);
  else if (line.includes('TS2307')) buckets['missing generated types'].push(line);
  else if (line.includes('TS2339') || line.includes('TS2322')) buckets['schema/type mismatch'].push(line);
  else buckets['unrelated legacy area'].push(line);
}

for (const [k, v] of Object.entries(buckets)) {
  console.log(`\n## ${k} (${v.length})`);
  v.slice(0, 30).forEach((x) => console.log(x));
  if (v.length > 30) console.log(`... ${v.length - 30} more`);
}
process.exit(0);
