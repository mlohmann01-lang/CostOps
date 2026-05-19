import type { ContractVersionRecord } from "./contract-version-types"; export const registerContractVersion=(i:ContractVersionRecord)=>({...i,registered:true as const});
