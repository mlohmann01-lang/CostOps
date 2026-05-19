import type { CrossLayerDomainSignal } from './cross-layer-types'; import { adaptDomainToKernel } from './economic-domain-adapter';
export const kubernetesKernelAdapter=(signal:CrossLayerDomainSignal)=>adaptDomainToKernel(signal);
