import { operationsstorybuilder } from './runtime-story-builder';
import { operationsrisksummarybuilder } from './risk-summary-builder';
export const operationsnarrativereport=(items:{provider:string;risk:string;propagationRisk:string;dependencyRisk:string;verificationDelay:string;rollbackTiming:string;sharedService:boolean;approval:string;blastRadius:string;}[])=>({stories:items.map(operationsstorybuilder),summary:operationsrisksummarybuilder(items)});
