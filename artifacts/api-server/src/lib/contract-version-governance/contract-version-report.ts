import { registerContractVersion } from "./contract-version-registry"; export const computeContractVersionReport=(i:any)=>({version:registerContractVersion(i),proof:"evidence-linked"});
