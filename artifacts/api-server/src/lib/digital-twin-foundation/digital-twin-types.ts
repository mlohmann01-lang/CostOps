export type TwinInput={id:string;name?:string;workload?:number;cost?:number;governanceEvidenceConfidence?:number;relationships?:string[];tokenDemand?:number;runtimeUnits?:number};
export type TwinState={id:string;deterministicForecast:true;workload:number;cost:number;governanceState:string;evidenceConfidence:number;relationships:string[]};
