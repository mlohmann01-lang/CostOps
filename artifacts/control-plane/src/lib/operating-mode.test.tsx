import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { getOperatingModeConfig, operatingModeOptions } from './operatingMode'
const read = (path:string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('operating mode config returns DEMO by default', () => {
  const config = getOperatingModeConfig()
  assert.equal(config.mode, 'DEMO')
  assert.equal(config.label, 'Demo Mode')
  assert.equal(operatingModeOptions.length, 3)
})

test('operating mode configs describe data source and execution controls', () => {
  assert.equal(getOperatingModeConfig('DEMO').dataSourceLabel, 'Sample governance dataset')
  assert.equal(getOperatingModeConfig('PILOT').dataSourceLabel, 'Connected tenant data')
  assert.equal(getOperatingModeConfig('PILOT').executionModeLabel, 'Approval-gated execution')
  assert.equal(getOperatingModeConfig('PRODUCTION').dataSourceLabel, 'Live tenant data')
  assert.equal(getOperatingModeConfig('PRODUCTION').executionModeLabel, 'Governed production controls')
})

test('WorkspaceModeBanner renders workspace mode data source and execution mode', () => {
  const banner = read('../components/executive/WorkspaceModeBanner.tsx')
  assert.equal(banner.includes('Workspace Mode'), true)
  assert.equal(banner.includes('Data Source'), true)
  assert.equal(banner.includes('Execution Mode'), true)
  assert.equal(banner.includes('getOperatingModeConfig'), true)
})
