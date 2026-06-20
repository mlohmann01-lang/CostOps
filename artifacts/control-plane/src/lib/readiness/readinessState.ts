export type ReadinessStatus = 'not_configured' | 'missing_data' | 'blocked' | 'warning' | 'ready'

export interface ReadinessSummary {
  status: ReadinessStatus
  readinessPercent: number
  blockers: string[]
  nextActions: string[]
}

export interface ReadinessInput {
  connectorConnected: boolean
  discoveryComplete: boolean
  recommendationsAvailable: boolean
  trustReady: boolean
  executionReady: boolean
}

export function deriveReadinessSummary(input: ReadinessInput): ReadinessSummary {
  const blockers: string[] = []
  const nextActions: string[] = []
  let completedCount = 0

  if (input.connectorConnected) {
    completedCount++
  } else {
    blockers.push('No data connector is connected.')
    nextActions.push('Connect a data source to begin discovery.')
  }

  if (input.discoveryComplete) {
    completedCount++
  } else {
    blockers.push('Discovery has not completed.')
    nextActions.push('Complete discovery to surface assets.')
  }

  if (input.recommendationsAvailable) {
    completedCount++
  } else {
    blockers.push('No recommendations are available yet.')
    nextActions.push('Run analysis to generate recommendations.')
  }

  if (input.trustReady) {
    completedCount++
  } else {
    blockers.push('Trust verification is not complete.')
    nextActions.push('Complete trust verification steps.')
  }

  if (input.executionReady) {
    completedCount++
  } else {
    blockers.push('Execution is not yet ready.')
    nextActions.push('Resolve outstanding items to enable execution.')
  }

  const readinessPercent = Math.round((completedCount / 5) * 100)

  let status: ReadinessStatus
  if (readinessPercent === 100) {
    status = 'ready'
  } else if (blockers.length > 0) {
    status = 'blocked'
  } else {
    status = 'missing_data'
  }

  return { status, readinessPercent, blockers, nextActions }
}
