import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// MW-001 regression: AuthorityCatalog, EconomicControlChain and OutcomeFinance were added
// (Programs 2/3/5) without importing/rendering the shared <Shell> (sidebar/header/command
// palette) that every other authenticated page renders through. This left them floating
// outside the application shell even though their routes were wired correctly via
// RequireRuntime in App.tsx. The fix wraps each page's root JSX in <Shell>...</Shell>,
// matching the pattern used by every other page (e.g. TechnologyPortfolio).
//
// These assertions are static/source-based, following the convention already used by
// sidebar-overview-regression.test.tsx and outcome-protection-ui.test.tsx in this repo.

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

const pages = [
  { name: 'AuthorityCatalog', path: '../pages/intelligence/AuthorityCatalog.tsx', shellImport: "import { Shell } from '../../components/layout/Shell'" },
  { name: 'EconomicControlChain', path: '../pages/intelligence/EconomicControlChain.tsx', shellImport: "import { Shell } from '../../components/layout/Shell'" },
  { name: 'OutcomeFinance', path: '../pages/executive/OutcomeFinance.tsx', shellImport: "import { Shell } from '../../components/layout/Shell'" },
]

for (const page of pages) {
  test(`${page.name} imports and renders the shared Shell`, () => {
    const source = read(page.path)
    assert.equal(source.includes(page.shellImport), true, `${page.name} must import Shell from components/layout/Shell`)
    assert.equal(source.includes('<Shell>'), true, `${page.name} must render <Shell> as its root wrapper`)
    assert.equal(source.includes('</Shell>'), true, `${page.name} must close </Shell>`)
  })
}

test('Sidebar still lists nav entries for all three Intelligence pages', () => {
  const sidebar = read('../components/layout/Sidebar.tsx')
  assert.equal(sidebar.includes("{ label: 'Authority Catalog'"), true)
  assert.equal(sidebar.includes("href: '/intelligence/authority-catalog'"), true)
  assert.equal(sidebar.includes("{ label: 'Economic Control Chain'"), true)
  assert.equal(sidebar.includes("href: '/intelligence/economic-control-chain'"), true)
  assert.equal(sidebar.includes("{ label: 'Outcome Finance'"), true)
  assert.equal(sidebar.includes("href: '/executive/outcome-finance'"), true)
})

test('App.tsx routes the three pages through RequireRuntime, same as other shell-wrapped pages', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes('function AuthorityCatalogRoute() {\n  return <RequireRuntime><AuthorityCatalog /></RequireRuntime>\n}'), true)
  assert.equal(app.includes('function EconomicControlChainRoute() {\n  return <RequireRuntime><EconomicControlChain /></RequireRuntime>\n}'), true)
  assert.equal(app.includes('function OutcomeFinanceRoute() {\n  return <RequireRuntime><OutcomeFinance /></RequireRuntime>\n}'), true)
  assert.equal(app.includes('<Route path="/intelligence/authority-catalog" component={AuthorityCatalogRoute} />'), true)
  assert.equal(app.includes('<Route path="/intelligence/economic-control-chain" component={EconomicControlChainRoute} />'), true)
  assert.equal(app.includes('<Route path="/executive/outcome-finance" component={OutcomeFinanceRoute} />'), true)
})

test('Page content/copy of the three pages is unchanged by the shell fix', () => {
  const authorityCatalog = read('../pages/intelligence/AuthorityCatalog.tsx')
  const economicControlChain = read('../pages/intelligence/EconomicControlChain.tsx')
  const outcomeFinance = read('../pages/executive/OutcomeFinance.tsx')
  assert.equal(authorityCatalog.includes('Authority Catalog'), true)
  assert.equal(authorityCatalog.includes('Discover what Certen can identify, govern, execute, verify and protect across your technology estate.'), true)
  assert.equal(economicControlChain.includes('Economic Control Chain'), true)
  assert.equal(economicControlChain.includes('See how Certen transforms technology, commercial and financial signals into verified and protected outcomes.'), true)
  assert.equal(outcomeFinance.includes('Outcome Finance'), true)
  assert.equal(outcomeFinance.includes('Finance validation of identified, executed and verified technology savings.'), true)
})
