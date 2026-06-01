import type { Vendor } from './vendor-change-types'

export type VendorSignalSourceType = 'RSS' | 'WEB_PAGE' | 'DOC_PAGE' | 'API' | 'MANUAL'
export type VendorSignalState = 'NEW' | 'DUPLICATE' | 'NORMALIZED' | 'IGNORED' | 'FAILED'

export interface VendorSignal {
  signalId: string
  tenantId: string
  vendor: Vendor
  sourceType: VendorSignalSourceType
  sourceUrl: string
  title: string
  rawText: string
  detectedAt: string
  publishedAt?: string
  hash: string
  signalState: VendorSignalState
  duplicateOfSignalId?: string
}
