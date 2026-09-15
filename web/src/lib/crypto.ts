import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Symmetric encryption for secrets stored at rest (currently the shared AI API
 * keys on SiteSetting). Uses AES-256-GCM with a 32-byte master key read from
 * the `AI_ENCRYPTION_KEY` env var (64 hex chars, or base64 decoding to 32
 * bytes). The stored string is `iv.authTag.ciphertext`, each part base64.
 *
 * The plaintext key never leaves the server: settings APIs only ever report
 * whether a key is set, never the value.
 */

const FORMAT_VERSION = "v1";

function loadKey(): Buffer {
  const raw = process.env.AI_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error(
      "AI_ENCRYPTION_KEY is not set — cannot encrypt/decrypt AI API keys. Add a 32-byte key (openssl rand -hex 32).",
    );
  }
  // Accept hex (64 chars) or base64; both must decode to exactly 32 bytes.
  let key: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    key = Buffer.from(raw, "hex");
  } else {
    key = Buffer.from(raw, "base64");
  }
  if (key.length !== 32) {
    throw new Error("AI_ENCRYPTION_KEY must decode to exactly 32 bytes (use: openssl rand -hex 32).");
  }
  return key;
}

/** True when the master key is present and valid — safe to call anywhere. */
export function isEncryptionConfigured(): boolean {
  try {
    loadKey();
    return true;
  } catch {
    return false;
  }
}

/** Encrypt a plaintext secret into a `v1.iv.tag.ciphertext` string. */
export function encryptSecret(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [FORMAT_VERSION, iv.toString("base64"), authTag.toString("base64"), ciphertext.toString("base64")].join(".");
}

/** Decrypt a string produced by {@link encryptSecret}. Throws on tamper/format errors. */
export function decryptSecret(encoded: string): string {
  const key = loadKey();
  const parts = encoded.split(".");
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error("Invalid encrypted secret format.");
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
