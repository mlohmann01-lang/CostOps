export interface RollbackStep { stepId:string; dependsOn:string[]; rollbackProof?:string; blocked?:boolean; risk:'LOW'|'MEDIUM'|'HIGH'; }
