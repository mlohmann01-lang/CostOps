import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

function findUp(start: string, predicate: (candidate: string) => boolean): string {
  let current = resolve(start);
  while (true) {
    if (predicate(current)) return current;
    const parent = dirname(current);
    if (parent === current) throw new Error(`TEST_HARNESS_PATH_NOT_FOUND from ${start}`);
    current = parent;
  }
}

export function resolveRepoPath(...parts: string[]) {
  const root = findUp(process.cwd(), (candidate) => existsSync(join(candidate, 'pnpm-workspace.yaml')) && existsSync(join(candidate, 'artifacts/api-server/package.json')));
  return join(root, ...parts);
}

export function resolvePackagePath(...parts: string[]) {
  const root = findUp(process.cwd(), (candidate) => {
    const direct = existsSync(join(candidate, 'package.json')) && existsSync(join(candidate, 'src/tests')) && existsSync(join(candidate, 'scripts/run-pattern-tests.mjs'));
    const fromRepo = existsSync(join(candidate, 'artifacts/api-server/package.json')) && existsSync(join(candidate, 'artifacts/api-server/src/tests')) && existsSync(join(candidate, 'artifacts/api-server/scripts/run-pattern-tests.mjs'));
    return direct || fromRepo;
  });
  const packageRoot = existsSync(join(root, 'src/tests')) ? root : join(root, 'artifacts/api-server');
  return join(packageRoot, ...parts);
}

export function resolveSourcePath(...parts: string[]) {
  return resolvePackagePath('src', ...parts);
}

export function readSourcePath(...parts: string[]) {
  return readFileSync(resolveSourcePath(...parts), 'utf8');
}

export function readSourceDir(...parts: string[]) {
  return readdirSync(resolveSourcePath(...parts));
}
