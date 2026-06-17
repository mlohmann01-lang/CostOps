import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { MicrosoftOAuthConnection, MicrosoftTokenSet, StoredMicrosoftCredential } from "./microsoft-auth-types";
const keyFromSecret = (secret: string) => createHash("sha256").update(secret).digest();
export class EncryptedMicrosoftTokenStore {
  private readonly records = new Map<string, StoredMicrosoftCredential>();
  constructor(private readonly encryptionSecret = process.env.MICROSOFT_TOKEN_ENCRYPTION_KEY ?? "local-dev-encryption-boundary") {}
  async store(connection: Omit<MicrosoftOAuthConnection, "credentialRef" | "createdAt" | "updatedAt"> & { credentialRef?: string }, tokens: MicrosoftTokenSet): Promise<MicrosoftOAuthConnection> {
    const now = new Date().toISOString();
    const credentialRef = connection.credentialRef ?? `mscred_${randomBytes(12).toString("hex")}`;
    const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", keyFromSecret(this.encryptionSecret), iv);
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(tokens), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const full: MicrosoftOAuthConnection = { ...connection, credentialRef, createdAt: now, updatedAt: now };
    this.records.set(credentialRef, { credentialRef, encryptedTokenPayload: [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join("."), connection: full });
    return full;
  }
  async getConnection(credentialRef: string) { return this.records.get(credentialRef)?.connection; }
  async getTokenSet(credentialRef: string): Promise<MicrosoftTokenSet | undefined> {
    const record = this.records.get(credentialRef); if (!record) return undefined;
    const [ivB64, tagB64, dataB64] = record.encryptedTokenPayload.split(".");
    const decipher = createDecipheriv("aes-256-gcm", keyFromSecret(this.encryptionSecret), Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return JSON.parse(Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8"));
  }
  async updateStatus(credentialRef: string, status: MicrosoftOAuthConnection["status"], failureReason?: string) { const r = this.records.get(credentialRef); if (r) r.connection = { ...r.connection, status, failureReason, updatedAt: new Date().toISOString(), lastValidatedAt: new Date().toISOString() }; return r?.connection; }
  async revoke(credentialRef: string) { return this.updateStatus(credentialRef, "REVOKED"); }
  // Deliberately exposes only encrypted payload metadata, never plaintext tokens.
  async inspectEncryptedRecord(credentialRef: string) { return this.records.get(credentialRef); }
}
