import test from 'node:test'
import assert from 'node:assert/strict'
import { ConnectorRegistry } from '../lib/connectors/sdk/connectorRegistry'
import { MockConnector } from '../lib/connectors/sdk/mockConnector'

test('Connector SDK registry registers lists and retrieves connectors', () => {
  const registry = new ConnectorRegistry()
  const connector = new MockConnector()
  registry.register(connector)
  assert.deepEqual(registry.list(), ['MOCK'])
  assert.equal(registry.get('MOCK'), connector)
})

test('Connector SDK registry blocks duplicate providers', () => {
  const registry = new ConnectorRegistry()
  registry.register(new MockConnector())
  assert.throws(() => registry.register(new MockConnector()), /Connector already registered: MOCK/)
})

test('Connector SDK registry throws clear error for unknown provider', () => {
  const registry = new ConnectorRegistry()
  assert.throws(() => registry.get('AWS'), /Connector not registered: AWS/)
})
