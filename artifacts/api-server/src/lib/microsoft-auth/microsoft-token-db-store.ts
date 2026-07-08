import { EncryptedMicrosoftTokenStore, type MicrosoftCredentialBackingStore } from "./microsoft-token-store";
import type { MicrosoftOAuthConnection, StoredMicrosoftCredential } from "./microsoft-auth-types";

// Durable, tenant/replica-safe backing store for Microsoft/M365 OAuth credentials.
// Kept in its own module (rather than folded into microsoft-token-store.ts) so that
// unit tests exercising the in-memory store never need to import @workspace/db.
export class DatabaseMicrosoftCredentialStore implements MicrosoftCredentialBackingStore {
  private async db() { return import("@workspace/db"); }

  async upsert(record: StoredMicrosoftCredential): Promise<void> {
    const { db, microsoftOauthCredentialsTable } = await this.db();
    await db
      .insert(microsoftOauthCredentialsTable)
      .values({
        credentialRef: record.credentialRef,
        tenantId: record.connection.tenantId,
        connectorKey: record.connection.connectorKey,
        encryptedTokenPayload: record.encryptedTokenPayload,
        connection: record.connection,
      })
      .onConflictDoUpdate({
        target: microsoftOauthCredentialsTable.credentialRef,
        set: {
          encryptedTokenPayload: record.encryptedTokenPayload,
          connection: record.connection,
          updatedAt: new Date(),
        },
      });
  }

  async get(credentialRef: string): Promise<StoredMicrosoftCredential | undefined> {
    const { db, microsoftOauthCredentialsTable } = await this.db();
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(microsoftOauthCredentialsTable)
      .where(eq(microsoftOauthCredentialsTable.credentialRef, credentialRef))
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    return {
      credentialRef: row.credentialRef,
      encryptedTokenPayload: row.encryptedTokenPayload,
      connection: row.connection as MicrosoftOAuthConnection,
    };
  }
}

// Production wiring entrypoint: picks a durable, DB-backed credential store when
// DATABASE_URL is configured, and fails closed in production when it is not —
// never silently falls back to the non-durable in-memory store.
export function createMicrosoftTokenStore(encryptionSecret?: string): EncryptedMicrosoftTokenStore {
  if (process.env.DATABASE_URL) {
    return new EncryptedMicrosoftTokenStore(encryptionSecret, new DatabaseMicrosoftCredentialStore());
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FAIL_CLOSED: DATABASE_URL must be set in production — refusing to store Microsoft/M365 credentials in non-durable memory.",
    );
  }
  return new EncryptedMicrosoftTokenStore(encryptionSecret);
}
