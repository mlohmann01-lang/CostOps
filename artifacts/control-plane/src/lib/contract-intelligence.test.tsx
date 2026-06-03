import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoContractIntelligence } from '../data/demo'
import { contractApiPaths } from '../hooks/useContractIntelligenceData'

test('demo contract dataset includes required contracts and unused values', () => {
  assert.equal(demoContractIntelligence.summary.contracts, 18)
  assert.equal(demoContractIntelligence.summary.atRisk, 4)
  assert.equal(demoContractIntelligence.summary.unusedValue, 240000)
  assert.ok(demoContractIntelligence.contracts.some((contract: any) => contract.contractName === 'Microsoft Enterprise Agreement' && contract.unusedValue === 68000))
  assert.ok(demoContractIntelligence.contracts.some((contract: any) => contract.contractName === 'AWS EDP' && contract.unusedValue === 104000))
  assert.ok(demoContractIntelligence.contracts.some((contract: any) => contract.contractName === 'Snowflake Commitment' && contract.unusedValue === 22000))
  assert.ok(demoContractIntelligence.contracts.some((contract: any) => contract.contractName === 'Adobe Enterprise' && contract.unusedValue === 11000))
})

test('Contract Intelligence page route and nav render', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/contract-intelligence'), true)
  assert.equal(sidebar.includes('Technology Portfolio'), true)
  assert.equal(sidebar.includes('Intelligence'), true)
})

test('Contract Intelligence page renders summary cards and table', () => {
  const page = fs.readFileSync(new URL('../pages/ContractIntelligenceView.tsx', import.meta.url), 'utf8')
  for (const text of ['Contracts', 'At Risk', 'Unused Value', 'Generated Opportunities', 'Contract', 'Vendor', 'Annual Value', 'Auto Renew', 'Risk']) assert.equal(page.includes(text), true)
})

test('live API wiring uses contract APIs without demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useContractIntelligenceData.ts', import.meta.url), 'utf8')
  assert.deepEqual(contractApiPaths, ['/api/contracts', '/api/contracts/high-risk', '/api/contracts/opportunities'])
  assert.equal(hook.includes("liveFetch<any>('/api/contracts')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/contracts/high-risk')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/contracts/opportunities')"), true)
  assert.equal(hook.includes('catch (err)'), true)
})

test('Command and Runtime Health show contract intelligence signals', () => {
  const command = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(command.includes('Contract Risk'), true)
  assert.equal(command.includes('contracts require review'), true)
  assert.equal(runtime.includes('Contract Intelligence Pipeline'), true)
  assert.equal(runtime.includes('contract-intelligence-pipeline'), true)
})
