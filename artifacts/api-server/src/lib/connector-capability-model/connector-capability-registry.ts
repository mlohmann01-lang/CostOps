import { ConnectorActionCapability } from './connector-capability-types';
export const connectorCapabilityRegistry: ReadonlyArray<ConnectorActionCapability> = Object.freeze([
  { connector:'KUBERNETES_READONLY',action:'READ_NAMESPACE_COST',capability:'READ_ONLY',permissionScope:'k8s:read',reversible:false,idempotent:true },
  { connector:'AWS',action:'STOP_APPROVED_NON_PROD_RESOURCE',capability:'REVERSIBLE_EXECUTION',permissionScope:'aws:stop_non_prod',reversible:true,idempotent:true },
  { connector:'M365',action:'REMOVE_INACTIVE_LICENSE',capability:'APPROVAL_REQUIRED',permissionScope:'m365:license:write',reversible:true,idempotent:false },
]);
