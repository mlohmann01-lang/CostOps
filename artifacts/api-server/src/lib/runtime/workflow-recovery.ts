export function reconcileWorkflows(input:{workflows:any[]; now?:Date}) {
  const now = input.now ?? new Date();
  let staleWorkflowCount = 0;
  const reconciled = input.workflows.map((w)=>{
    if (w.approvalState === 'PENDING_APPROVAL' && new Date(w.approvalExpiryAt).getTime() < now.getTime()) { staleWorkflowCount++; return { ...w, approvalState:'EXPIRED', updatedAt: now.toISOString() }; }
    return w;
  });
  return { reconciled, staleWorkflowCount, backlog: staleWorkflowCount };
}
