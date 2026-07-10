import { test } from 'node:test'
import assert from 'node:assert/strict'
import { headlessQuestionCatalog } from './headlessQuestionCatalog'
import { resolveHeadlessQuestion, findHeadlessQuestion } from './headlessQuestionResolver'

test('catalog contains exactly 12 questions', () => {
  assert.equal(headlessQuestionCatalog.length, 12)
})

test('every question has id, question, audience, category, sourceSurfaces', () => {
  for (const question of headlessQuestionCatalog) {
    assert.equal(typeof question.id, 'string')
    assert.ok(question.id.length > 0)
    assert.equal(typeof question.question, 'string')
    assert.ok(question.question.length > 0)
    assert.ok(Array.isArray(question.audience))
    assert.ok(question.audience.length > 0)
    assert.equal(typeof question.category, 'string')
    assert.ok(Array.isArray(question.sourceSurfaces))
    assert.ok(question.sourceSurfaces.length > 0)
    assert.ok(Array.isArray(question.aliases))
  }
})

test('catalog question ids are unique', () => {
  const ids = headlessQuestionCatalog.map((q) => q.id)
  assert.equal(new Set(ids).size, ids.length)
})

test('resolver returns a valid answer object for every catalog question', () => {
  for (const question of headlessQuestionCatalog) {
    const answer = resolveHeadlessQuestion(question.id)
    assert.equal(answer.questionId, question.id)
    assert.equal(typeof answer.answer, 'string')
    assert.ok(answer.answer.length > 0)
    assert.ok(['HIGH', 'MEDIUM', 'LOW', 'NOT_AVAILABLE'].includes(answer.confidence))
    assert.ok(Array.isArray(answer.evidence))
    assert.ok(Array.isArray(answer.recommendedActions))
    assert.ok(Array.isArray(answer.sourceSurfaces))
    assert.ok(['ANSWERED', 'PARTIAL', 'NOT_AVAILABLE'].includes(answer.state))
  }
})

test('what_value_has_finance_validated reflects incomplete finance reconciliation in default data', () => {
  const answer = resolveHeadlessQuestion('what_value_has_finance_validated')
  assert.equal(answer.confidence, 'NOT_AVAILABLE')
  assert.equal(answer.state, 'PARTIAL')
  assert.ok(answer.answer.toLowerCase().includes('finance'))
})

test('what_authorities_are_available references Authority Catalog', () => {
  const answer = resolveHeadlessQuestion('what_authorities_are_available')
  const referencesAuthorityCatalog =
    answer.sourceSurfaces.includes('Authority Catalog') ||
    answer.evidence.some((e) => e.label === 'Authority Catalog')
  assert.ok(referencesAuthorityCatalog)
})

test('what_value_is_protected references Outcome Protection', () => {
  const answer = resolveHeadlessQuestion('what_value_is_protected')
  const referencesOutcomeProtection =
    answer.sourceSurfaces.includes('Outcome Protection') ||
    answer.evidence.some((e) => e.label === 'Outcome Protection')
  assert.ok(referencesOutcomeProtection)
})

test('findHeadlessQuestion matches by id, exact question text, alias, and returns null otherwise', () => {
  const byId = findHeadlessQuestion('what_should_i_do_next')
  assert.ok(byId)
  assert.equal(byId?.id, 'what_should_i_do_next')

  const byQuestionText = findHeadlessQuestion('Is Certen ready to execute?')
  assert.ok(byQuestionText)
  assert.equal(byQuestionText?.id, 'is_certen_ready_to_execute')

  const byAlias = findHeadlessQuestion('what next')
  assert.ok(byAlias)
  assert.equal(byAlias?.id, 'what_should_i_do_next')

  const unmatched = findHeadlessQuestion('does certen make coffee')
  assert.equal(unmatched, null)
})
