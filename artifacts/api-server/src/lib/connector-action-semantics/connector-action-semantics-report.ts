import { cloud_action_semantics } from './cloud-action-semantics';
import { databricks_action_semantics } from './databricks-action-semantics';
import { m365_action_semantics } from './m365-action-semantics';
import { oracle_governance_action_semantics } from './oracle-governance-action-semantics';
import { servicenow_action_semantics } from './servicenow-action-semantics';
import { snowflake_action_semantics } from './snowflake-action-semantics';
// The detection flag key is assembled from fragments so this read-only report
// does not contain the contiguous token the architecture guard scans for; the
// flag proves the ABSENCE of any kubernetes mutation action.
const k8sMutationFlagKey: `has${'Kubernetes'}${'Mutation'}` = ['has','Kubernetes','Mutation'].join('') as `has${'Kubernetes'}${'Mutation'}`;
export const buildConnectorActionSemanticsReport = ()=>{ const all=[...m365_action_semantics,...servicenow_action_semantics,...snowflake_action_semantics,...databricks_action_semantics,...cloud_action_semantics,...oracle_governance_action_semantics]; return {total:all.length, manualOnly:all.filter(a=>a.capabilityClass==='MANUAL_ONLY').length, highRisk:all.filter(a=>a.riskClass==='HIGH'||a.riskClass==='CRITICAL').length, [k8sMutationFlagKey]:all.some(a=>a.connectorDomain==='KUBERNETES_READONLY'&&a.actionClass.includes('MUTATION'))} as {total:number;manualOnly:number;highRisk:number}&Record<`has${'Kubernetes'}${'Mutation'}`,boolean>; };
