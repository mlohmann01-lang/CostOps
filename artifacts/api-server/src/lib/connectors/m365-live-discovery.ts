import { fetchGraphUsers, fetchGraphUserActivity, fetchGraphUserLicences, getGraphAccessToken } from './m365/m365-graph-client'

export async function discoverM365ReadOnly(input: {
  tenantId: string
  tokenProvider?: typeof getGraphAccessToken
  usersProvider?: typeof fetchGraphUsers
  licencesProvider?: typeof fetchGraphUserLicences
  activityProvider?: typeof fetchGraphUserActivity
}) {
  const token = await (input.tokenProvider ?? getGraphAccessToken)()
  if (!token.accessToken) return { tenantId: input.tenantId, users: [], readOnly: true, error: token.error }

  const usersOutput = await (input.usersProvider ?? fetchGraphUsers)(token.accessToken)
  const licences = await (input.licencesProvider ?? fetchGraphUserLicences)(token.accessToken, usersOutput.users as any)
  const activity = await (input.activityProvider ?? fetchGraphUserActivity)(token.accessToken, usersOutput.users as any).catch(() => ({ lastLoginDaysByUpn: {} }))
  const users = usersOutput.users.map((user: any) => ({
    tenantId: input.tenantId,
    userId: user.id,
    userPrincipalName: user.userPrincipalName,
    displayName: user.displayName,
    accountEnabled: user.accountEnabled !== false,
    assignedLicenses: licences.licencesByUpn[user.userPrincipalName] ?? (user.assignedLicenses ?? []).map((license: any) => String(license.skuId ?? license)),
    lastLoginDaysAgo: (activity as any).lastLoginDaysByUpn?.[user.userPrincipalName] ?? null,
    lifecycleState: 'TRUSTED',
    confidenceScore: 0.9,
    sourceReferences: [`m365:user:${user.id}`],
    connectorHealth: 'HEALTHY',
    dataFreshnessScore: 0.9,
    ingestionRunId: `live-read-${Date.now()}`,
  }))
  return { tenantId: input.tenantId, users, readOnly: true, requestId: usersOutput.requestId }
}
