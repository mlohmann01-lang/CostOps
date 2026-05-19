import type { CrossLayerDomainSignal } from './cross-layer-types'; import { adaptDomainToKernel } from './economic-domain-adapter';
export const ai_runtimeKernelAdapter=(signal:CrossLayerDomainSignal)=>adaptDomainToKernel(signal);
