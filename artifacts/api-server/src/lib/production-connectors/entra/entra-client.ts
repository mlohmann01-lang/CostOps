import type { ProductionConnectorContext, RawFetchResult, RawProductionRecord } from "../production-connector-types";
import { MicrosoftGraphHttpClient } from "../../microsoft-auth";
import { entraFixtures } from "./entra-tests-fixtures";
export class EntraGraphClient {
  private graph?: MicrosoftGraphHttpClient;
  constructor(private readonly options: { credentialRef?: string; tokenProvider?: ProductionConnectorContext["tokenProvider"]; graphClient?: MicrosoftGraphHttpClient } = {}) { this.graph = options.graphClient; }
  private async live(context: ProductionConnectorContext) { if (!context.credentialRef) throw Object.assign(new Error("missing credentialRef"), { code: "MICROSOFT_AUTH_FAILED" }); if (!context.tokenProvider) throw Object.assign(new Error("missing token provider"), { code: "MICROSOFT_AUTH_FAILED" }); return this.graph ?? new MicrosoftGraphHttpClient({ tokenProvider: () => context.tokenProvider!({ tenantId: context.tenantId, connectorKey: context.connectorKey, credentialRef: context.credentialRef!, scopes: [] }) }); }
  async fetchDirectoryUsers(context: ProductionConnectorContext) { return (await this.live(context)).getAllPages("/users?$select=id,userPrincipalName,displayName,department,employeeId,accountEnabled,onPremisesExtensionAttributes"); }
  async fetchGroups(context: ProductionConnectorContext) { return (await this.live(context)).getAllPages("/groups?$select=id,displayName,mail,securityEnabled"); }
  async fetchUserManager(context: ProductionConnectorContext, userId: string) { try { return await (await this.live(context)).get(`/users/${encodeURIComponent(userId)}/manager`); } catch { return undefined; } }
  async fetchDirectoryObjects(context: ProductionConnectorContext) { return (await this.live(context)).getAllPages("/directoryObjects"); }
  async fetchUserTransitiveMemberOf(context: ProductionConnectorContext, userId: string) { return (await this.live(context)).getAllPages(`/users/${encodeURIComponent(userId)}/transitiveMemberOf`); }
  async fetchRecords(context: ProductionConnectorContext): Promise<RawFetchResult> {
    if (context.mode === "SYNC" && !context.tokenProvider) return { status: "BLOCKED", reason: "TOKEN_PROVIDER_NOT_CONFIGURED", records: [] };
    if (!context.credentialRef || !context.tokenProvider || context.config?.useFixtures) return { status: "READY", records: entraFixtures };
    const records: RawProductionRecord[] = []; const endpointStatus: NonNullable<RawFetchResult["endpointStatus"]> = [];
    try { const users = await this.fetchDirectoryUsers(context); endpointStatus.push({ endpoint: "users", status: "AVAILABLE" }); users.forEach((u: any) => records.push({ id: String(u.id), kind: "user", payload: { ...u, costCentreId: u.costCentreId ?? u.onPremisesExtensionAttributes?.extensionAttribute1 }, sourceEndpoint: "users" })); const groups = await this.fetchGroups(context); endpointStatus.push({ endpoint: "groups", status: "AVAILABLE" }); groups.forEach((g: any) => records.push({ id: String(g.id), kind: "group", payload: g, sourceEndpoint: "groups" })); for (const u of users.slice(0, 50)) { const manager = await this.fetchUserManager(context, String(u.id)); if (manager?.id) records.push({ id: `${u.id}_manager_${manager.id}`, kind: "managerRelation", payload: { userId: u.id, managerId: manager.id }, sourceEndpoint: "users/manager" }); if (u.department) records.push({ id: `department_${u.department}`, kind: "department", payload: { id: u.department, name: u.department }, sourceEndpoint: "users" }); } return { status: "READY", records, endpointStatus }; } catch (e: any) { return { status: "BLOCKED", reason: e.code ?? e.message, records, endpointStatus }; }
  }
}
