/**
 * Sprint 7: canonical pillar narrative for the control-plane UI (onboarding,
 * readiness, executive dashboard copy). Mirrors
 * artifacts/api-server/src/lib/platform-taxonomy/platform-story-registry.ts
 * exactly -- control-plane is a browser bundle and cannot import the
 * api-server package, so the strings are kept here in lockstep rather than
 * re-derived.
 */
export type Pillar = 'AUTO_EXECUTION' | 'VALUE_REALISATION' | 'PROTECTED_GOVERNANCE' | 'SHARED_PLATFORM';

export interface PillarStory {
  pillar: Pillar;
  title: string;
  narrative: string;
  question: string;
}

export const platformStoryRegistry: Record<'AUTO_EXECUTION' | 'VALUE_REALISATION' | 'PROTECTED_GOVERNANCE', PillarStory> = {
  AUTO_EXECUTION: {
    pillar: 'AUTO_EXECUTION',
    title: 'Auto Execution',
    narrative: 'We safely execute approved value opportunities.',
    question: 'What was done?',
  },
  VALUE_REALISATION: {
    pillar: 'VALUE_REALISATION',
    title: 'Value Realisation',
    narrative: 'We prove technology investments create measurable value.',
    question: 'What value was created?',
  },
  PROTECTED_GOVERNANCE: {
    pillar: 'PROTECTED_GOVERNANCE',
    title: 'Protected Governance',
    narrative: 'We ensure realised value remains protected.',
    question: 'How do we know it stayed fixed?',
  },
};

export const pillarStorySequence: PillarStory[] = [
  platformStoryRegistry.AUTO_EXECUTION,
  platformStoryRegistry.VALUE_REALISATION,
  platformStoryRegistry.PROTECTED_GOVERNANCE,
];
