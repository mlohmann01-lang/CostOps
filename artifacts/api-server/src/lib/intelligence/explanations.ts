export function explainBlocked(reason:string,evidence:unknown){ return { whyBlocked: reason, evidenceLinked: true, evidence }; }
export function explainApprovalRequired(reason:string){ return { whyApprovalRequired: reason }; }
