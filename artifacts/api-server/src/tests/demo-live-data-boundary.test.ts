import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { createDemoSeedEnvelope } from '../lib/demo-seed'
import { liveDataState, normalizeRuntimeDataMode } from '../lib/runtime/data-mode'

function repoRoot(): string {
  let dir = process.cwd()
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    dir = dirname(dir)
  }
  return process.cwd()
}
const root = join(repoRoot(), 'artifacts')
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (['node_modules', 'dist', 'build', 'coverage'].includes(name)) return []
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

test('canonical runtime data mode maps legacy flags without creating demo fallback', () => {
  assert.equal(normalizeRuntimeDataMode('DEMO'), 'DEMO')
  assert.equal(normalizeRuntimeDataMode('LIVE'), 'LIVE')
  assert.equal(normalizeRuntimeDataMode('TEST'), 'TEST')
  assert.equal(normalizeRuntimeDataMode('SIMULATION'), 'SIMULATION')
  assert.equal(normalizeRuntimeDataMode('true'), 'DEMO')
  assert.equal(normalizeRuntimeDataMode(undefined), 'LIVE')
})

test('live state helper never returns DEMO', () => {
  assert.equal(liveDataState({ connected: false }), 'NOT_CONNECTED')
  assert.equal(liveDataState({ error: new Error('x') }), 'ERROR')
  assert.equal(liveDataState({ connected: true, hasData: false }), 'NO_DATA')
  assert.equal(liveDataState({ connected: true, hasData: true }), 'LIVE')
})

test('demo seed boundary refuses LIVE mode', () => {
  assert.throws(() => createDemoSeedEnvelope([], { mode: 'LIVE' }), /DEMO mode/)
  assert.equal(createDemoSeedEnvelope([{ id: 'demo' }], { mode: 'DEMO' }).dataState, 'DEMO')
})

test('api live routes and services do not import demo seed modules', () => {
  const candidates = files(join(root, 'api-server/src')).filter((file) => /\/src\/(routes|lib)\//.test(file) && !/\/demo-seed\//.test(file) && !file.endsWith('.test.ts'))
  const offenders = candidates.filter((file) => readFileSync(file, 'utf8').includes('demo-seed'))
  assert.deepEqual(offenders.map((file) => relative(root, file)), [])
})

test('api live routes do not import fixture json', () => {
  const routeFiles = files(join(root, 'api-server/src/routes')).filter((file) => file.endsWith('.ts'))
  const offenders = routeFiles.filter((file) => /from ['"].*(fixture|fixtures).*\.json['"]/.test(readFileSync(file, 'utf8')))
  assert.deepEqual(offenders.map((file) => relative(root, file)), [])
})

test('mock connectors require simulation/test/demo naming instead of live masquerade', () => {
  const connectorFiles = files(join(root, 'api-server/src')).filter((file) => file.endsWith('.ts') && /connector/i.test(file))
  const offenders = connectorFiles.filter((file) => {
    const body = readFileSync(file, 'utf8')
    return /MOCK_CONNECTOR|mock connector/i.test(body) && /mode:\s*['"]LIVE['"]/.test(body) && !/SIMULATION|TEST|DEMO/.test(body)
  })
  assert.deepEqual(offenders.map((file) => relative(root, file)), [])
})
