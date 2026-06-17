import type { ProductionConnectorContext, RawFetchResult } from "../production-connector-types";
import { erpFixtures } from "./erp-tests-fixtures";
export class ERPGenericClient { constructor(private readonly options: { credentialRef?: string; tokenProvider?: ProductionConnectorContext["tokenProvider"] } = {}) {} async fetchRecords(context: ProductionConnectorContext): Promise<RawFetchResult> { if (!context.tokenProvider && context.mode === "SYNC") return { status: "BLOCKED", reason: "TOKEN_PROVIDER_NOT_CONFIGURED", records: [] }; return { status: "READY", records: erpFixtures }; } }
