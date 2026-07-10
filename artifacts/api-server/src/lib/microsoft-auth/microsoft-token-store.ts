import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { MicrosoftOAuthConnection, MicrosoftTokenSet, StoredMicrosoftCredential } from "./microsoft-auth-types";
import { resolveEncryptionKeySecret } from "../security/encryption-key-resolution";
const keyFromSecret = (secret: string) => createHash("sha256").update(secret).digest();

export interface MicrosoftCredentialBackingStore {
  upsert(record: StoredMicrosoftCredential): Promise<void>;
  // Tenant-scoped: a credentialRef that exists but belongs to a different tenant must
  // be treated identically to a non-existent record (undefined), never exposing
  // whether the ref exists for another tenant.
  get(tenantId: string, credentialRef: string): Promise<StoredMicrosoftCredential | undefined>;
}

// Non-durable, single-process backing store. Safe for local development and unit
// tests, but MUST NOT be used in production — credentials would be lost on every
// restart/redeploy and would not be shared across replicas. Production callers must
// go through createMicrosoftTokenStore() (microsoft-token-db-store.ts), which fails
// closed if no durable backing store is available.
export class InMemoryMicrosoftCredentialStore implements MicrosoftCredentialBackingStore {
  private readonly records = new Map<string, StoredMicrosoftCredential>();
  async upsert(record: StoredMicrosoftCredential) { this.records.set(record.credentialRef, record); }
  async get(tenantId: string, credentialRef: string) {
    const record = this.records.get(credentialRef);
    return record && record.connection.tenantId === tenantId ? record : undefined;
  }
}

export class EncryptedMicrosoftTokenStore {
  private readonly encryptionSecret: string;
  private readonly backing: MicrosoftCredentialBackingStore;

  constructor(encryptionSecret?: string, backing?: MicrosoftCredentialBackingStore) {
    this.encryptionSecret = encryptionSecret ?? resolveEncryptionKeySecret("MICROSOFT_TOKEN_ENCRYPTION_KEY", "local-dev-encryption-boundary");
    if (backing) {
      this.backing = backing;
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "FAIL_CLOSED: EncryptedMicrosoftTokenStore requires a durable backing store in production. " +
          "Use createMicrosoftTokenStore() from microsoft-token-db-store.ts instead of constructing this class directly.",
        );
      }
      this.backing = new InMemoryMicrosoftCredentialStore();
    }
  }

  async store(connection: Omit<MicrosoftOAuthConnection, "credentialRef" | "createdAt" | "updatedAt"> & { credentialRef?: string }, tokens: MicrosoftTokenSet): Promise<MicrosoftOAuthConnection> {
    const now = new Date().toISOString();
    const credentialRef = connection.credentialRef ?? `mscred_${randomBytes(12).toString("hex")}`;
    const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", keyFromSecret(this.encryptionSecret), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const full: MicrosoftOAuthConnection = { ...connection, credentialRef, createdAt: now, updatedAt: now };
    await this.backing.upsert({ credentialRef, encryptedTokenPayload: [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join("."), connection: full });
    return full;
  }
  async getConnection(tenantId: string, credentialRef: string) { return (await this.backing.get(tenantId, credentialRef))?.connection; }
  async getTokenSet(tenantId: string, credentialRef: string): Promise<MicrosoftTokenSet | undefined> {
    const record = await this.backing.get(tenantId, credentialRef); if (!record) return undefined;
    const [ivB64, tagB64, dataB64] = record.encryptedTokenPayload.split(".");
    const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(this.encryptionSecret), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8"));
  }
  async updateStatus(tenantId: string, credentialRef: string, status: MicrosoftOAuthConnection["status"], failureReason?: string) {
    const r = await this.backing.get(tenantId, credentialRef); if (!r) return undefined;
    const connection: MicrosoftOAuthConnection = { ...r.connection, status, failureReason, updatedAt: new Date().toISOString(), lastValidatedAt: new Date().toISOString() };
    await this.backing.upsert({ ...r, connection });
    return connection;
  }
  async revoke(tenantId: string, credentialRef: string) { return this.updateStatus(tenantId, credentialRef, "REVOKED"); }
  // Deliberately exposes only encrypted payload metadata, never plaintext tokens.
  async inspectEncryptedRecord(tenantId: string, credentialRef: string) { return this.backing.get(tenantId, credentialRef); }
}
