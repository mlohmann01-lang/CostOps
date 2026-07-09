// PX0.10 — Live Tenant Bootstrap.
//
// Makes a brand-new LIVE tenant immediately usable by composing existing,
// real services. Creates no new authority and no new governance model:
// default roles/policies/settings already exist as TenantProvisioningService
// (governance policy, pilot profile, onboarding record), and live-mode
// readiness already exists as liveTenantReadinessService. This module only
// sequences those real write paths.
import { TenantProvisioningService } from '../tenant-provisioning-service';
import { liveTenantReadinessService } from '../live-tenant-readiness';
import { connectorReadinessService } from '../connector-readiness/connector-readiness-service';
import type { Domain } from '../live-tenant-readiness/live-tenant-readiness-types';

export interface LiveTenantBootstrapInput {
  tenantName: string;
  tenantSlug: string;
  adminEmail: string;
  environment: string;
  actorId: string;
  requiredDomains?: Domain[];
  primaryUseCase?: string;
}

export interface LiveTenantBootstrapResult {
  tenantId: string;
  status: 'PROVISIONED';
  readinessScore: number;
  overallStatus: string;
  onboardingStepCount: number;
}

const DEFAULT_REQUIRED_DOMAINS: Domain[] = ['COMMERCIAL', 'USAGE', 'OWNERSHIP'];

export class LiveTenantBootstrapService {
  constructor(
    public provisioning: TenantProvisioningService = new TenantProvisioningService(),
    public readiness = liveTenantReadinessService,
    public connectors = connectorReadinessService,
  ) {}

  async bootstrap(input: LiveTenantBootstrapInput): Promise<LiveTenantBootstrapResult> {
    // Default Roles + Default Policies + Default Settings — reuses the real
    // tenant provisioning write paths (governance policy, pilot profile,
    // onboarding record) rather than inventing a parallel mechanism.
    const provisioned = await this.provisioning.provision({
      tenantName: input.tenantName,
      tenantSlug: input.tenantSlug,
      adminEmail: input.adminEmail,
      environment: input.environment,
      actorId: input.actorId,
    });
    const tenantId = provisioned.tenantId;

    await this.readiness.createTenantProfile({
      tenantId,
      tenantName: input.tenantName,
      mode: 'LIVE',
      lifecycleStage: 'ONBOARDING',
      primaryUseCase: input.primaryUseCase ?? 'TECHNOLOGY_PORTFOLIO_OPTIMISATION',
      requiredDomains: input.requiredDomains ?? DEFAULT_REQUIRED_DOMAINS,
    });

    await this.connectors.registerDefaultManifests();

    const onboardingSteps = await this.readiness.generateOnboardingPlan(tenantId);
    const snapshot = await this.readiness.buildReadinessSnapshot(tenantId);

    return {
      tenantId,
      status: 'PROVISIONED',
      readinessScore: snapshot.readinessScore,
      overallStatus: snapshot.overallStatus,
      onboardingStepCount: onboardingSteps.length,
    };
  }
}

export const liveTenantBootstrapService = new LiveTenantBootstrapService();
