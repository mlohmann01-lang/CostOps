export interface GovernedStep { id:string; certified:boolean; approvalTier:number; rollbackable:boolean; dependencyPassed:boolean; verdict:'PASS'|'MANUAL_ONLY'|'BLOCKED'; proof?:string; }
