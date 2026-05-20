export type DependencyType='EVIDENCE_DEPENDENCY'|'APPROVAL_DEPENDENCY'|'ASSET_DEPENDENCY'|'ROLLBACK_DEPENDENCY'|'CONNECTOR_DEPENDENCY'|'POLICY_DEPENDENCY'|'VERIFICATION_DEPENDENCY';
export interface DependencyNode { id:string; risk:'LOW'|'MEDIUM'|'HIGH'; sharedService?:boolean; proof?:string; blocked?:boolean; }
export interface DependencyEdge { from:string; to:string; type:DependencyType; }
