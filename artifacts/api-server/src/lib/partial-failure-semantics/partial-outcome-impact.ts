import { PartialFailureClass } from './partial-failure-types';
export const computeSavingsImpact=(base:number,c:PartialFailureClass)=> c==='NONE'?base:['ENTRA_SYNC_PENDING','DATABRICKS_POLICY_PROPAGATION_DELAY','CLOUD_TAG_PROPAGATION_DELAY'].includes(c)?base*0.7:c==='PARTIAL_SUCCESS'?base*0.5:['ORACLE_ENTITLEMENT_AMBIGUOUS','UNKNOWN_OUTCOME'].includes(c)?base*0.2:0;
export const partial_outcome_impact = { semanticProfile: true, deterministic: true };
