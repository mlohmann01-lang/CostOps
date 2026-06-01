import type { VendorSignal } from './vendor-signal-types'

export class VendorSignalRepository {
  private static signals = new Map<string, VendorSignal>()
  private static hashes = new Map<string, string>()
  private key(tenantId: string, signalId: string) { return `${tenantId}:${signalId}` }
  private hashKey(tenantId: string, hash: string) { return `${tenantId}:${hash}` }

  upsert(signal: VendorSignal) {
    VendorSignalRepository.signals.set(this.key(signal.tenantId, signal.signalId), signal)
    if (signal.signalState !== 'DUPLICATE') VendorSignalRepository.hashes.set(this.hashKey(signal.tenantId, signal.hash), signal.signalId)
    return signal
  }
  get(tenantId: string, signalId: string) { return VendorSignalRepository.signals.get(this.key(tenantId, signalId)) ?? null }
  getByHash(tenantId: string, hash: string) { const id = VendorSignalRepository.hashes.get(this.hashKey(tenantId, hash)); return id ? this.get(tenantId, id) : null }
  list(tenantId: string) { return [...VendorSignalRepository.signals.values()].filter((signal) => signal.tenantId === tenantId).sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)) }
  setState(tenantId: string, signalId: string, signalState: VendorSignal['signalState']) { const signal = this.get(tenantId, signalId); if (!signal) return null; return this.upsert({ ...signal, signalState }) }
  clearForTests() { VendorSignalRepository.signals.clear(); VendorSignalRepository.hashes.clear() }
}
