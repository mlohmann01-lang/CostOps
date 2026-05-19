import type { CrossLayerDomainSignal } from './cross-layer-types'; import { adaptDomainToKernel } from './economic-domain-adapter';
export const commitmentKernelAdapter=(signal:CrossLayerDomainSignal)=>adaptDomainToKernel(signal);
