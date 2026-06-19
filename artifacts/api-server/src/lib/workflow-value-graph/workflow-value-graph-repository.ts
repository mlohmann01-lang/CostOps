import { createPersistenceStore, MemoryPersistenceStore } from './workflow-value-graph-persistence';
import type {
  PersistenceStore, Workflow, WorkflowAsset, WorkflowDecision, WorkflowInvestment,
  WorkflowOutcome, WorkflowPrincipal, WorkflowValueSignal,
} from './workflow-value-graph-types';

export interface WorkflowValueGraphStores {
  workflows: PersistenceStore<Workflow>;
  assets: PersistenceStore<WorkflowAsset>;
  principals: PersistenceStore<WorkflowPrincipal>;
  decisions: PersistenceStore<WorkflowDecision>;
  outcomes: PersistenceStore<WorkflowOutcome>;
  investments: PersistenceStore<WorkflowInvestment>;
  valueSignals: PersistenceStore<WorkflowValueSignal>;
}

export const createWorkflowValueGraphStores = (): WorkflowValueGraphStores => ({
  workflows: createPersistenceStore('WORKFLOWS'),
  assets: createPersistenceStore('WORKFLOW_ASSETS'),
  principals: createPersistenceStore('WORKFLOW_PRINCIPALS'),
  decisions: createPersistenceStore('WORKFLOW_DECISIONS'),
  outcomes: createPersistenceStore('WORKFLOW_OUTCOMES'),
  investments: createPersistenceStore('WORKFLOW_INVESTMENTS'),
  valueSignals: createPersistenceStore('WORKFLOW_VALUE_SIGNALS'),
});

export const createInMemoryWorkflowValueGraphStores = (): WorkflowValueGraphStores => ({
  workflows: new MemoryPersistenceStore('WORKFLOWS'),
  assets: new MemoryPersistenceStore('WORKFLOW_ASSETS'),
  principals: new MemoryPersistenceStore('WORKFLOW_PRINCIPALS'),
  decisions: new MemoryPersistenceStore('WORKFLOW_DECISIONS'),
  outcomes: new MemoryPersistenceStore('WORKFLOW_OUTCOMES'),
  investments: new MemoryPersistenceStore('WORKFLOW_INVESTMENTS'),
  valueSignals: new MemoryPersistenceStore('WORKFLOW_VALUE_SIGNALS'),
});

export class WorkflowValueGraphRepository {
  constructor(private readonly s: WorkflowValueGraphStores = createWorkflowValueGraphStores()) {}

  upsertWorkflow(v: Workflow) { return this.s.workflows.upsert(v); }
  getWorkflow(t: string, id: string) { return this.s.workflows.get(t, id); }
  listWorkflows(t: string, f: Record<string, unknown> = {}) { return this.s.workflows.list(t, f); }

  upsertWorkflowAsset(v: WorkflowAsset) { return this.s.assets.upsert(v); }
  listWorkflowAssets(t: string, f: Record<string, unknown> = {}) { return this.s.assets.list(t, f); }

  upsertWorkflowPrincipal(v: WorkflowPrincipal) { return this.s.principals.upsert(v); }
  listWorkflowPrincipals(t: string, f: Record<string, unknown> = {}) { return this.s.principals.list(t, f); }

  upsertWorkflowDecision(v: WorkflowDecision) { return this.s.decisions.upsert(v); }
  listWorkflowDecisions(t: string, f: Record<string, unknown> = {}) { return this.s.decisions.list(t, f); }

  upsertWorkflowOutcome(v: WorkflowOutcome) { return this.s.outcomes.upsert(v); }
  listWorkflowOutcomes(t: string, f: Record<string, unknown> = {}) { return this.s.outcomes.list(t, f); }

  upsertWorkflowInvestment(v: WorkflowInvestment) { return this.s.investments.upsert(v); }
  listWorkflowInvestments(t: string, f: Record<string, unknown> = {}) { return this.s.investments.list(t, f); }

  upsertWorkflowValueSignal(v: WorkflowValueSignal) { return this.s.valueSignals.upsert(v); }
  listWorkflowValueSignals(t: string, f: Record<string, unknown> = {}) { return this.s.valueSignals.list(t, f); }

  async deleteTenantWorkflowData(t: string) { await Promise.all(Object.values(this.s).map((x) => x.deleteTenant(t))); }
  async collectionStatus() {
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(this.s)) out[k] = await v.size();
    return out;
  }
}

export const workflowValueGraphRepository = new WorkflowValueGraphRepository();
