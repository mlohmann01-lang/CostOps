import { computePropagationChain } from "./propagation-chain-calculator";
export const computeNonlinearPropagationReport=(i:any)=>({curves:i.curves, chain:computePropagationChain({stages:i.curves})});
