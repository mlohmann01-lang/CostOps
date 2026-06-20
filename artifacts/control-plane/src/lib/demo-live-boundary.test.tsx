import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { liveDataState, normalizeRuntimeDataMode } from './runtime/dataMode'
import { liveTenantReadinessDemoSeed } from './demo-seed/liveTenantReadinessDemoSeed'

function repoRoot(): string {
  let dir = process.cwd()
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir
    dir = path.dirname(dir)
  }
  return process.cwd()
}
const srcRoot = path.join(repoRoot(), 'artifacts/control-plane/src')
function files(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((name) => {
    if (['node_modules', 'dist', 'build', 'coverage'].includes(name)) return []
    const full = path.join(dir, name)
    return fs.statSync(full).isDirectory() ? files(full) : [full]
  })
}

test('control-plane uses canonical runtime data modes', () => {
  assert.deepEqual(['DEMO', 'LIVE', 'TEST', 'SIMULATION'].map(normalizeRuntimeDataMode), ['DEMO', 'LIVE', 'TEST', 'SIMULATION'])
  assert.equal(normalizeRuntimeDataMode(undefined), 'LIVE')
})

test('live data state cannot be DEMO', () => {
  assert.equal(liveDataState({ connected: false }), 'NOT_CONNECTED')
  assert.equal(liveDataState({ error: 'boom' }), 'ERROR')
  assert.equal(liveDataState({ connected: true, hasData: false }), 'NO_DATA')
  assert.equal(liveDataState({ connected: true, hasData: true }), 'LIVE')
})

test('demo seed is deterministic and labelled as demo', () => {
  const first = liveTenantReadinessDemoSeed()
  const second = liveTenantReadinessDemoSeed()
  assert.deepEqual(first, second)
  assert.equal(first.isDemo, true)
  assert.match(first.readiness.tenantId, /^demo-/)
})

test('live tenant readiness hook no longer falls back to demo seed on API errors', () => {
  const hook = fs.readFileSync(path.join(srcRoot, 'hooks/useLiveTenantReadinessData.ts'), 'utf8')
  assert.equal(hook.includes('setIsDemo(true)'), false)
  assert.equal(hook.includes('demoLiveTenantReadiness'), false)
  assert.match(hook, /setData\(normalizeReadinessPayload\(\)\)/)
})

test('customer-facing pages do not import demo seed modules directly', () => {
  const pageFiles = files(path.join(srcRoot, 'pages')).filter((file) => /\.(ts|tsx)$/.test(file))
  const offenders = pageFiles.filter((file) => fs.readFileSync(file, 'utf8').includes('demo-seed'))
  assert.deepEqual(offenders.map((file) => path.relative(srcRoot, file)), [])
})
