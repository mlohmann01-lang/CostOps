import type { OnboardingProvider, TenantOnboardingState } from './onboarding-types'

export class OnboardingRepository {
  private readonly states = new Map<string, TenantOnboardingState>()
  private key(tenantId: string, provider: OnboardingProvider) { return `${tenantId}:${provider}` }
  async get(tenantId: string, provider: OnboardingProvider) { return this.states.get(this.key(tenantId, provider)) ?? null }
  async save(state: TenantOnboardingState) { this.states.set(this.key(state.tenantId, state.provider), state); return state }
  clearForTests() { this.states.clear() }
}

export const onboardingRepository = new OnboardingRepository()
