import type { CertificationInput } from './governance-certification-types';export const certifyReplayIntegrity=(input:CertificationInput)=>({ok:input.replayDeterministic});
