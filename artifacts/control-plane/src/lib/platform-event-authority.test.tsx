import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Platform Event Timeline component renders canonical timeline', () => {
  const component = fs.readFileSync(new URL('../components/shared/PlatformEventTimeline.tsx', import.meta.url), 'utf8')
  assert.equal(component.includes('platform-event-timeline'), true)
  assert.equal(component.includes('event.category'), true)
  assert.equal(component.includes('event.type'), true)
})

test('runtime activity uses platform event authority endpoint without live demo fallback', () => {
  const live = fs.readFileSync(new URL('../lib/liveRuntimeEvents.ts', import.meta.url), 'utf8')
  const hook = fs.readFileSync(new URL('../hooks/useRuntimeEvents.ts', import.meta.url), 'utf8')
  assert.equal(live.includes('/api/events/recent'), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('setEvents([])'), true)
})

test('Command activity reuses RuntimeActivityList backed by PlatformEventTimeline', () => {
  // NOTE (Program 6 test cleanup): CommandView was rewritten into the Executive Command Center
  // orchestrator and no longer renders a "What Changed" runtime activity section, so it no
  // longer imports RuntimeActivityList. The RuntimeActivityList foundation component itself
  // (still backed by PlatformEventTimeline) is unaffected and used elsewhere.
  const runtimeList = fs.readFileSync(new URL('../components/shared/RuntimeActivityList.tsx', import.meta.url), 'utf8')
  assert.equal(runtimeList.includes('PlatformEventTimeline'), true)
})
