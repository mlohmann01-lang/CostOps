import { loadCommandViewState } from '../lib/commandViewData'
import { loadGovernanceState } from '../lib/governanceData'
import { loadExecutionState } from '../lib/executionData'
import { loadIntelligenceState } from '../lib/intelligenceViewData'
import { loadOutcomeLedgerState } from '../lib/outcomeLedgerData'
import { loadDriftMonitorState } from '../lib/driftMonitorData'
import { loadConnectorHubState } from '../lib/connectorHubData'
import type { CommandViewRuntimeOptions } from '../lib/commandViewData'

export const commandService = { load: (runtime: CommandViewRuntimeOptions) => loadCommandViewState(runtime) }
export const governanceService = { load: (runtime: CommandViewRuntimeOptions) => loadGovernanceState(runtime) }
export const executionService = { load: (runtime: CommandViewRuntimeOptions) => loadExecutionState(runtime) }
export const intelligenceService = { load: (runtime: CommandViewRuntimeOptions) => loadIntelligenceState(runtime) }
export const outcomeLedgerService = { load: (runtime: CommandViewRuntimeOptions) => loadOutcomeLedgerState(runtime) }
export const driftService = { load: (runtime: CommandViewRuntimeOptions) => loadDriftMonitorState(runtime) }
export const connectorService = { load: (runtime: CommandViewRuntimeOptions) => loadConnectorHubState(runtime) }
