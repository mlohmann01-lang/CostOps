import { PartialFailureClass } from './partial-failure-types';
export const governanceSeverity=(c:PartialFailureClass)=>['ROLLBACK_FAILED'].includes(c)?'CRITICAL':['ORACLE_ENTITLEMENT_AMBIGUOUS','UNKNOWN_OUTCOME','VERIFICATION_FAILED'].includes(c)?'HIGH':['ENTRA_SYNC_PENDING','SNOWFLAKE_QUERY_QUEUE_MISMATCH','DATABRICKS_POLICY_PROPAGATION_DELAY','SERVICENOW_WORKFLOW_STALE','CLOUD_TAG_PROPAGATION_DELAY','PARTIAL_SUCCESS'].includes(c)?'MEDIUM':'LOW';
export const partial_failure_governance = { semanticProfile: true, deterministic: true };
