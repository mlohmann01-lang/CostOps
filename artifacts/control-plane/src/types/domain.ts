import type { Domain } from './connector'

export type { Domain }

export interface DomainMeta {
  id: Domain
  label: string
}

export const DOMAINS: DomainMeta[] = [
  { id: 'all', label: 'All domains' },
  { id: 'ai', label: 'AI runtime' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'saas', label: 'SaaS / M365' },
  { id: 'itam', label: 'ITAM' },
  { id: 'data', label: 'Data platforms' },
]

export function domainFromPath(path: string): Domain {
  const segment = path.split('/')[1] as Domain
  const valid: Domain[] = ['all', 'ai', 'cloud', 'saas', 'itam', 'data']
  return valid.includes(segment) ? segment : 'all'
}
