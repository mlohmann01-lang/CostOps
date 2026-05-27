import { runGovernanceChecks } from './scheduled-task-runner';

export class GovernanceScheduler {
  async tick(tenantId: string) {
    return runGovernanceChecks(tenantId, 'SCHEDULER');
  }
}
