import { EvidenceRegistryV2Service } from "../evidence-registry-v2-service";
import { PrincipalAuthorityService } from "../principal-authority-service";
import { AssetRegistryService } from "../assets/asset-registry-service";

type ActorInput = { tenantId: string; actorId?: string | null; displayName?: string | null; sourceSystem?: string | null };
type EvidenceInput = { tenantId: string; entityType: string; entityId: string; stage: string; role: string; actorId?: string | null; payload?: unknown; sourceSystem?: string | null; sourceEntityType?: string | null; sourceEntityId?: string | null; relationshipType?: string; trustScore?: string | number | null };

const isEmail = (value: string) => /@/.test(value);

export class ExecutionLifecycleAuthorityService {
  constructor(private readonly principals = new PrincipalAuthorityService(), private readonly evidence = new EvidenceRegistryV2Service(), private readonly assets = new AssetRegistryService()) {}

  async resolveActor(input: ActorInput) {
    const actor = String(input.actorId ?? input.displayName ?? "system");
    return this.principals.resolvePrincipal({ tenantId: input.tenantId, email: isEmail(actor) ? actor : null, externalId: isEmail(actor) ? null : actor, displayName: input.displayName ?? actor, sourceSystem: input.sourceSystem ?? "CERTEN" });
  }

  private inferAssetInput(input: EvidenceInput) {
    const payload = (input.payload && typeof input.payload === "object" ? input.payload : {}) as Record<string, any>;
    const request = payload.request ?? payload.execution?.request ?? {};
    const recommendation = payload.recommendation ?? {};
    const targetEntityId = payload.targetEntityId ?? request.targetEntityId ?? recommendation.targetEntityId ?? payload.userId ?? payload.userPrincipalName;
    const email = payload.userPrincipalName ?? payload.email ?? request.userEmail ?? recommendation.userEmail;
    const displayName = payload.displayName ?? request.displayName ?? recommendation.displayName ?? email ?? targetEntityId;
    if (!targetEntityId && !email && !displayName) return null;
    const sourceSystem = String(input.sourceSystem ?? payload.sourceSystem ?? request.platform ?? "CERTEN").toUpperCase();
    return { tenantId: input.tenantId, sourceSystem, sourceEntityType: input.sourceEntityType ?? input.entityType, sourceEntityId: String(targetEntityId ?? email ?? input.entityId), externalId: String(targetEntityId ?? email ?? input.entityId), assetType: email || String(sourceSystem).includes("M365") ? "USER" as const : "UNKNOWN" as const, displayName: String(displayName ?? targetEntityId ?? input.entityId), email: email ? String(email) : undefined, metadata: { inferredFromLifecycleStage: input.stage, lifecycleEntityType: input.entityType, lifecycleEntityId: input.entityId } };
  }

  async recordStage(input: EvidenceInput) {
    const principal = await this.resolveActor({ tenantId: input.tenantId, actorId: input.actorId, sourceSystem: input.sourceSystem });
    if (principal) {
      await this.principals.recordActionEvent({ tenantId: input.tenantId, principalId: principal.id, actionContextType: input.entityType, actionContextId: input.entityId, role: input.role, metadata: { stage: input.stage, sourceSystem: input.sourceSystem ?? "CERTEN", payload: input.payload ?? {} } });
    }
    const resolvedAsset = await this.assets.resolveAsset(this.inferAssetInput(input) ?? { tenantId: input.tenantId, sourceSystem: input.sourceSystem ?? "CERTEN", sourceEntityType: input.sourceEntityType ?? input.entityType, sourceEntityId: input.sourceEntityId ?? input.entityId, assetType: "UNKNOWN", displayName: input.entityId });
    const payload = { ...(input.payload && typeof input.payload === "object" ? input.payload as Record<string, unknown> : { value: input.payload }), canonicalAsset: resolvedAsset?.asset ? { assetId: resolvedAsset.asset.id, assetType: resolvedAsset.asset.assetType, displayName: resolvedAsset.asset.displayName, sourceMappingId: resolvedAsset.mapping?.id } : null };
    const item = await this.evidence.createEvidenceItem({ tenantId: input.tenantId, evidenceType: input.stage, sourceSystem: input.sourceSystem ?? "CERTEN", sourceEntityType: input.sourceEntityType ?? input.entityType, sourceEntityId: input.sourceEntityId ?? input.entityId, collectedByPrincipalId: principal?.id, trustScore: input.trustScore, payload });
    const link = await this.evidence.linkEvidenceToEntity({ tenantId: input.tenantId, evidenceItemId: item.id, linkedEntityType: input.entityType, linkedEntityId: input.entityId, relationshipType: input.relationshipType ?? "AUDIT_TRAIL" });
    const assetLink = resolvedAsset?.asset ? await this.assets.linkEvidenceToAsset({ tenantId: input.tenantId, evidenceItemId: item.id, assetId: resolvedAsset.asset.id, relationshipType: "RELATES_TO" }) : null;
    return { principal, evidenceItem: item, evidenceLink: link, asset: resolvedAsset?.asset ?? null, assetEvidenceLink: assetLink };
  }
}
