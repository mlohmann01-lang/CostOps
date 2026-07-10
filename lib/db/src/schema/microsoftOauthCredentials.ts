import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const microsoftOauthCredentialsTable = pgTable(
  "microsoft_oauth_credentials",
  {
    credentialRef: text("credential_ref").primaryKey(),
    tenantId: text("tenant_id").notNull(),
    connectorKey: text("connector_key").notNull(),
    encryptedTokenPayload: text("encrypted_token_payload").notNull(),
    connection: jsonb("connection").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    tenantIdx: index("microsoft_oauth_credentials_tenant_idx").on(table.tenantId),
  }),
);
