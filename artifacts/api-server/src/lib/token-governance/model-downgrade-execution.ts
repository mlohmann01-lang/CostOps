/**
 * Model Downgrade Execution Engine (Sprint D, Part 3)
 *
 * Takes a MODEL_ROUTING recommendation and executes a model downgrade
 * with DUAL_APPROVAL for class A risks.
 */

import { logger } from '../logger.js';
import { tokenGovernancePolicyRegistry } from './token-governance-policy.js';

export type ModelDowngradeProposal = {
  proposalId: string;
  tenantId: string;
  fromModel: string;
  toModel: string;
  reason: string;
  estimatedMonthlySavingsUSD: number;
  affectedWorkflows: string[];
  riskClass: 'A' | 'B' | 'C';
  requiresDualApproval: boolean;
};

export type ModelDowngradeExecution = {
  executionId: string;
  proposalId: string;
  tenantId: string;
  fromModel: string;
  toModel: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'EXECUTED' | 'ROLLED_BACK' | 'FAILED';
  approvalChain: ApprovalRecord[];
  executedAt?: string;
  rollbackReason?: string;
  requiresDualApproval?: boolean;
};

export type ApprovalRecord = {
  approverActorId: string;
  approvedAt: string;
  approvalType: 'FIRST_APPROVAL' | 'SECOND_APPROVAL' | 'OVERRIDE';
};

/**
 * Model downgrade execution engine
 */
export class ModelDowngradeExecutor {
  private executions: Map<string, ModelDowngradeExecution> = new Map();
  private routingTable: Map<string, string> = new Map(); // Maps old model → new model

  /**
   * Create a downgrade proposal from a recommendation
   */
  createProposal(
    tenantId: string,
    fromModel: string,
    toModel: string,
    reason: string,
    estimatedSavings: number,
    affectedWorkflows: string[],
  ): ModelDowngradeProposal {
    const policy = tokenGovernancePolicyRegistry.listTenantPolicies(tenantId)[0];
    const riskClass = policy?.riskClass || 'C';

    return {
      proposalId: `downgrade-${fromModel}-to-${toModel}-${Date.now()}`,
      tenantId,
      fromModel,
      toModel,
      reason,
      estimatedMonthlySavingsUSD: estimatedSavings,
      affectedWorkflows,
      riskClass,
      requiresDualApproval: riskClass === 'A',
    };
  }

  /**
   * Create execution from proposal (pending approval)
   */
  createExecution(proposal: ModelDowngradeProposal): ModelDowngradeExecution {
    const execution: ModelDowngradeExecution = {
      executionId: `exec-${proposal.proposalId}`,
      proposalId: proposal.proposalId,
      tenantId: proposal.tenantId,
      fromModel: proposal.fromModel,
      toModel: proposal.toModel,
      status: 'PENDING_APPROVAL',
      approvalChain: [],
      requiresDualApproval: proposal.requiresDualApproval,
    };

    this.executions.set(execution.executionId, execution);
    return execution;
  }

  /**
   * Record approval for a downgrade execution
   */
  recordApproval(executionId: string, approverActorId: string): {
    approved: boolean;
    nextStep?: string;
    blocked?: boolean;
  } {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return { approved: false };
    }

    const requiresDual = execution.requiresDualApproval ?? false;
    const firstApproval = execution.approvalChain[0];

    if (firstApproval && firstApproval.approverActorId === approverActorId) {
      return {
        approved: false,
        blocked: true,
        nextStep: 'DUAL_APPROVAL_SAME_ACTOR_BLOCKED',
      };
    }

    if (!firstApproval) {
      // First approval
      execution.approvalChain.push({
        approverActorId,
        approvedAt: new Date().toISOString(),
        approvalType: 'FIRST_APPROVAL',
      });

      if (requiresDual) {
        return {
          approved: false,
          nextStep: 'AWAITING_SECOND_APPROVAL',
        };
      } else {
        execution.status = 'APPROVED';
        return {
          approved: true,
          nextStep: 'READY_TO_EXECUTE',
        };
      }
    } else if (requiresDual && !execution.approvalChain[1]) {
      // Second approval
      execution.approvalChain.push({
        approverActorId,
        approvedAt: new Date().toISOString(),
        approvalType: 'SECOND_APPROVAL',
      });
      execution.status = 'APPROVED';
      return {
        approved: true,
        nextStep: 'READY_TO_EXECUTE',
      };
    }

    return { approved: true };
  }

  /**
   * Execute the downgrade (update routing table)
   */
  executeDowngrade(executionId: string): { success: boolean; error?: string } {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return { success: false, error: 'Execution not found' };
    }

    if (execution.status !== 'APPROVED') {
      return { success: false, error: `Execution status is ${execution.status}, not APPROVED` };
    }

    try {
      // Update routing table: old model → new model
      this.routingTable.set(execution.fromModel, execution.toModel);
      execution.status = 'EXECUTED';
      execution.executedAt = new Date().toISOString();

      logger.info(
        {
          executionId,
          fromModel: execution.fromModel,
          toModel: execution.toModel,
          tenantId: execution.tenantId,
          component: 'model-downgrade-executor',
        },
        'Model downgrade executed',
      );

      return { success: true };
    } catch (error) {
      execution.status = 'FAILED';
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Rollback a downgrade
   */
  rollback(executionId: string, reason: string): { success: boolean } {
    const execution = this.executions.get(executionId);
    if (!execution) {
      return { success: false };
    }

    if (execution.status !== 'EXECUTED') {
      return { success: false };
    }

    this.routingTable.delete(execution.fromModel);
    execution.status = 'ROLLED_BACK';
    execution.rollbackReason = reason;

    logger.info(
      {
        executionId,
        fromModel: execution.fromModel,
        reason,
        component: 'model-downgrade-executor',
      },
      'Model downgrade rolled back',
    );

    return { success: true };
  }

  /**
   * Resolve a model to its downgraded target (if applicable)
   */
  resolveModel(originalModel: string): string {
    return this.routingTable.get(originalModel) || originalModel;
  }

  /**
   * Get execution by ID
   */
  getExecution(executionId: string): ModelDowngradeExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * List executions for a tenant
   */
  listExecutions(tenantId: string): ModelDowngradeExecution[] {
    return Array.from(this.executions.values()).filter((e) => e.tenantId === tenantId);
  }
}

export const modelDowngradeExecutor = new ModelDowngradeExecutor();
