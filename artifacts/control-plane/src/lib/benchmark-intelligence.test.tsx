import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoBenchmarkIntelligence } from '../data/demo'
import { benchmarkApiPaths } from '../hooks/useBenchmarkIntelligenceData'

test('demo benchmark dataset includes required peer gaps', () => {
  assert.equal(demoBenchmarkIntelligence.summary.benchmarksEvaluated, 24)
  assert.equal(demoBenchmarkIntelligence.summary.highImpactGaps, 6)
  assert.equal(demoBenchmarkIntelligence.summary.recoverableValue, 114000)
  assert.ok(demoBenchmarkIntelligence.benchmarks.some((benchmark: any) => benchmark.category === 'COPILOT_ADOPTION' && benchmark.tenantValue === 18 && benchmark.benchmarkValue === 42))
  assert.ok(demoBenchmarkIntelligence.benchmarks.some((benchmark: any) => benchmark.category === 'SNOWFLAKE_EFFICIENCY' && benchmark.variancePercent === -17))
  assert.ok(demoBenchmarkIntelligence.benchmarks.some((benchmark: any) => benchmark.category === 'AI_RUNTIME_EFFICIENCY'))
})

test('Benchmark Intelligence page route and nav render', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/benchmark-intelligence'), true)
  assert.equal(sidebar.includes('Technology Portfolio'), true)
  assert.equal(sidebar.includes('Intelligence'), true)
})

test('Benchmark Intelligence page renders summary and table columns', () => {
  const page = fs.readFileSync(new URL('../pages/BenchmarkIntelligenceView.tsx', import.meta.url), 'utf8')
  for (const text of ['Benchmarks Evaluated', 'High Impact Gaps', 'Recoverable Value', 'Generated Opportunities', 'Category', 'Tenant', 'Benchmark', 'Variance', 'Impact', 'Opportunity']) assert.equal(page.includes(text), true)
})

test('live API wiring uses benchmark APIs without demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useBenchmarkIntelligenceData.ts', import.meta.url), 'utf8')
  assert.deepEqual(benchmarkApiPaths, ['/api/benchmarks', '/api/benchmarks/high-impact', '/api/benchmarks/opportunities'])
  assert.equal(hook.includes("liveFetch<any>('/api/benchmarks')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/benchmarks/high-impact')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/benchmarks/opportunities')"), true)
  assert.equal(hook.includes('catch (err)'), true)
})

test('Command and Runtime Health show benchmark intelligence signals', () => {
  // Program 6A coverage audit: CommandView's old "Benchmark Gaps" / "Potential Value:" widget
  // was removed when CommandView became the Executive Command Center orchestrator. The
  // Benchmark Gaps table itself still exists and renders on its own owning page
  // (BenchmarkIntelligenceView), so the coverage is relocated there instead of CommandView.
  // See PROGRAM_6A_COVERAGE_AUDIT.md.
  const benchmarkPage = fs.readFileSync(new URL('../pages/BenchmarkIntelligenceView.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  assert.equal(benchmarkPage.includes('Benchmark Gaps'), true)
  assert.equal(runtime.includes('Benchmark Intelligence Pipeline'), true)
  assert.equal(runtime.includes('benchmark-intelligence-pipeline'), true)
})
