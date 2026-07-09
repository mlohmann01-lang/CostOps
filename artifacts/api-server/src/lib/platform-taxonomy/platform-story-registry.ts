import type { Pillar } from './pillar-taxonomy-types';

/**
 * Canonical pillar narrative, reused (not redefined) by onboarding, dashboards,
 * proof packs, and executive summaries so the platform tells one story:
 * Investment -> Decision -> Outcome -> Protected Value.
 */
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

export function pillarStory(pillar: Pillar): PillarStory | undefined {
  if (pillar === 'SHARED_PLATFORM') return undefined;
  return platformStoryRegistry[pillar];
}
