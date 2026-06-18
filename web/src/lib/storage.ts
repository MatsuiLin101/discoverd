import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { mkdir, unlink, writeFile } from "fs/promises";
import { dirname, extname, join } from "path";
import { randomBytes } from "crypto";

/** Allowed upload content types → file extension. */
export const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export function isAllowedContentType(contentType: string): boolean {
  return contentType in MIME_TO_EXT;
}

export interface UploadAuth {
  /** Object key the file will be stored under. */
  key: string;
  /** Destination the client should send the file to. */
  uploadUrl: string;
  method: "PUT";
  /** Headers the client must include on the upload request. */
  headers: Record<string, string>;
}

export interface StorageDriver {
  /** Return upload authorization for direct client upload (R2: presigned PUT). */
  createUploadAuth(key: string, contentType: string): Promise<UploadAuth>;
  /** Server-side upload (used by local driver, or small server-side writes). */
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  /** Build the public URL from a stored key + configured base URL. */
  publicUrl(key: string): string;
}

/** Build an object key like `tours/2026/ab12cd34ef56.pdf`. */
export function buildKey(folder: string, filename: string, contentType?: string): string {
  let ext = extname(filename).replace(/^\./, "").toLowerCase();
  if (!ext && contentType) ext = MIME_TO_EXT[contentType] ?? "";
  if (!ext) ext = "bin";
  const year = new Date().getFullYear();
  const rand = randomBytes(8).toString("hex");
  return `${folder}/${year}/${rand}.${ext}`;
}

/** Folders that uploads may target. */
export const ALLOWED_UPLOAD_FOLDERS = new Set([
  "tour-files",
  "tours",
  "regions",
  "hero-banners",
  "seo-og/tours",
  "seo-og/regions",
  "seo-og/subregions",
]);

/** Subset of upload folders restricted to ADMIN role (STAFF cannot write here). */
export const ADMIN_ONLY_UPLOAD_FOLDERS = new Set(["hero-banners"]);

/** Resolve which allowed folder an object key belongs to, or null if none. */
export function matchUploadFolder(key: string): string | null {
  for (const folder of ALLOWED_UPLOAD_FOLDERS) {
    if (key.startsWith(`${folder}/`)) return folder;
  }
  return null;
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

// --- Cloudflare R2 (S3-compatible) -----------------------------------------

class R2Driver implements StorageDriver {
  private client: S3Client;
  private bucket: string;
  private publicBase: string;

  constructor() {
    const bucket = process.env.R2_BUCKET;
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!bucket || !endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 storage is not fully configured (R2_BUCKET / R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY).");
    }
    this.bucket = bucket;
    this.publicBase = trimSlash(process.env.STORAGE_PUBLIC_BASE_URL ?? "");
    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async createUploadAuth(key: string, contentType: string): Promise<UploadAuth> {
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: 600 });
    return { key, uploadUrl, method: "PUT", headers: { "Content-Type": contentType } };
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }));
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }
}

// --- Local disk -------------------------------------------------------------

class LocalDriver implements StorageDriver {
  /** Absolute directory files are written to. */
  private dir: string;
  /** Configured public base URL, or null to serve from Next `public/uploads`. */
  private publicBase: string | null;

  constructor() {
    const envDir = process.env.LOCAL_STORAGE_DIR;
    this.dir = envDir ? envDir : join(process.cwd(), "public", "uploads");
    const base = process.env.STORAGE_PUBLIC_BASE_URL;
    this.publicBase = base ? trimSlash(base) : null;
  }

  async createUploadAuth(key: string, contentType: string): Promise<UploadAuth> {
    // Local driver has no presigned URL — the client uploads through an App route.
    return {
      key,
      uploadUrl: `/api/admin/uploads/local?key=${encodeURIComponent(key)}`,
      method: "PUT",
      headers: { "Content-Type": contentType },
    };
  }

  async put(key: string, body: Buffer): Promise<void> {
    const abs = join(this.dir, key);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, body);
  }

  async delete(key: string): Promise<void> {
    await unlink(join(this.dir, key)).catch(() => {});
  }

  publicUrl(key: string): string {
    if (this.publicBase) return `${this.publicBase}/${key}`;
    // Dev fallback: files in public/uploads are served statically by Next.
    return `/uploads/${key}`;
  }
}

function createDriver(driver?: string): StorageDriver {
  if (driver === "local") return new LocalDriver();
  if (driver === "r2") return new R2Driver();
  // No explicit driver: use R2 when configured, otherwise local (keeps dev working).
  return process.env.R2_BUCKET ? new R2Driver() : new LocalDriver();
}

// Selected at runtime: "r2" | "local"
export const storage: StorageDriver = createDriver(process.env.STORAGE_DRIVER);

/**
 * True only when the active driver writes to local disk. The R2 driver uploads
 * directly to R2 via presigned URLs, so the server-side `/api/admin/uploads/local`
 * receiver must be disabled (404) under R2 to avoid an arbitrary-write proxy.
 */
export const isLocalStorageDriver = storage instanceof LocalDriver;
