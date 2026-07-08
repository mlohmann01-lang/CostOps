import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { MicrosoftOAuthConnection, MicrosoftTokenSet, StoredMicrosoftCredential } from "./microsoft-auth-types";
const keyFromSecret = (secret: string) => createHash("sha256").update(secret).digest();

export interface MicrosoftCredentialBackingStore {
  upsert(record: StoredMicrosoftCredential): Promise<void>;
  get(credentialRef: string): Promise<StoredMicrosoftCredential | undefined>;
}

// Non-durable, single-process backing store. Safe for local development and unit
// tests, but MUST NOT be used in production — credentials would be lost on every
// restart/redeploy and would not be shared across replicas. Production callers
// must go through createMicrosoftTokenStore() (microsoft-token-db-store.ts),
// which fails closed if no durable backing store is available.
export class InMemoryMicrosoftCredentialStore implements MicrosoftCredentialBackingStore {
  private readonly records = new Map<string, StoredMicrosoftCredential>();
  async upsert(record: StoredMicrosoftCredential) { this.records.set(record.credentialRef, record); }
  async get(credentialRef: string) { return this.records.get(credentialRef); }
}

function resolveEncryptionSecret(explicit?: string): string {
  const secret = explicit ?? process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "FAIL_CLOSED: MICROSOFT_TOKEN_ENCRYPTION_KEY must be set in production — refusing to encrypt Microsoft/M365 credentials with an insecure default key.",
    );
  }
  return "local-dev-encryption-boundary";
}

export class EncryptedMicrosoftTokenStore {
  private readonly encryptionSecret: string;
  private readonly backing: MicrosoftCredentialBackingStore;

  constructor(encryptionSecret?: string, backing?: MicrosoftCredentialBackingStore) {
    this.encryptionSecret = resolveEncryptionSecret(encryptionSecret);
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
  async getConnection(credentialRef: string) { return (await this.backing.get(credentialRef))?.connection; }
  async getTokenSet(credentialRef: string): Promise<MicrosoftTokenSet | undefined> {
    const record = await this.backing.get(credentialRef); if (!record) return undefined;
    const [ivB64, tagB64, dataB64] = record.encryptedTokenPayload.split(".");
    const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(this.encryptionSecret), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8"));
  }
  async updateStatus(credentialRef: string, status: MicrosoftOAuthConnection["status"], failureReason?: string) {
    const r = await this.backing.get(credentialRef); if (!r) return undefined;
    const connection: MicrosoftOAuthConnection = { ...r.connection, status, failureReason, updatedAt: new Date().toISOString(), lastValidatedAt: new Date().toISOString() };
    await this.backing.upsert({ ...r, connection });
    return connection;
  }
  async revoke(credentialRef: string) { return this.updateStatus(credentialRef, "REVOKED"); }
  // Deliberately exposes only encrypted payload metadata, never plaintext tokens.
  async inspectEncryptedRecord(credentialRef: string) { return this.backing.get(credentialRef); }
}
