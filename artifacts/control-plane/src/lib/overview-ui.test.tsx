import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Executive Command Center title renders', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('Executive Command Center'), true)
})

test('Six orchestrator sections render', () => {
  const page = read('../pages/CommandView.tsx')
  for (const title of [
    'Executive Summary',
    'What Requires Attention',
    'Economic Control Chain Status',
    'Executive Value Snapshot',
    'Outcome Finance Snapshot',
    'Recommended Next Actions',
  ]) assert.equal(page.includes(title), true)
})
