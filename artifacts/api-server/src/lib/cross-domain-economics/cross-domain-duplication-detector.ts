import type { CrossDomainDuplicationFinding } from "./cross-domain-economic-types";

export function detectCrossDomainDuplication(input:{tenantId:string; tools:Array<{tool:string; userOrTeam:string; monthlyCost:number}>}): CrossDomainDuplicationFinding[] {
  const toolSet = new Set(input.tools.map((t)=>t.tool.toLowerCase())); const findings:CrossDomainDuplicationFinding[]=[];
  const mk=(duplicationType:string,involvedTools:string[],recommendedAction:CrossDomainDuplicationFinding["recommendedAction"])=> findings.push({ findingId:`dup:${findings.length}`, tenantId:input.tenantId, duplicationType, involvedTools, involvedUsersOrTeams:[...new Set(input.tools.map((t)=>t.userOrTeam))], monthlyCostAtRisk:input.tools.reduce((s,t)=>s+t.monthlyCost,0), annualizedCostAtRisk:input.tools.reduce((s,t)=>s+t.monthlyCost,0)*12, confidence:0.75, severity:"HIGH", recommendedAction, evidenceRefs:["cross-domain-duplication"]});
  if (toolSet.has("copilot") && toolSet.has("cursor")) mk("COPILOT_AND_CURSOR_OVERLAP", ["Copilot","Cursor"], "RATIONALIZE");
  if (toolSet.has("copilot") && toolSet.has("chatgpt")) mk("COPILOT_AND_CHATGPT_OVERLAP", ["Copilot","ChatGPT"], "RATIONALIZE");
  if (toolSet.has("claude") && toolSet.has("chatgpt")) mk("CLAUDE_AND_CHATGPT_OVERLAP", ["Claude","ChatGPT"], "RATIONALIZE");
  return findings;
}
