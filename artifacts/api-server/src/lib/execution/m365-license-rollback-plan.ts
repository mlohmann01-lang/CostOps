export interface M365RollbackPlanInput { tenantId: string; userId: string; userPrincipalName?: string; skuId: string; skuPartNumber?: string; assignmentType?: 'DIRECT' | 'GROUP' | 'UNKNOWN'; userExists: boolean }
export interface RollbackPlan { supported: boolean; blockers: string[]; steps: string[] }

export function buildM365LicenseRollbackPlan(input: M365RollbackPlanInput): RollbackPlan {
  const blockers: string[] = []
  if (!input.userExists) blockers.push('User must exist to support ADD_LICENSE rollback readiness.')
  if (!input.skuId) blockers.push('SKU ID is required for rollback readiness.')
  if (input.assignmentType === 'GROUP') blockers.push('Group-assigned license rollback requires group membership governance, not direct ADD_LICENSE.')
  const supported = blockers.length === 0
  return { supported, blockers, steps: supported ? [`Confirm ${input.userPrincipalName ?? input.userId} still exists`, `Prepare ADD_LICENSE for ${input.skuPartNumber ?? input.skuId}`, 'Require separate approval before any live rollback mutation', 'Verify assignedLicenses contains restored SKU after rollback if separately approved'] : [] }
}
