import type { CrossLayerDomainSignal } from './cross-layer-types'; import { adaptDomainToKernel } from './economic-domain-adapter';
export const cloudKernelAdapter=(signal:CrossLayerDomainSignal)=>adaptDomainToKernel(signal);
