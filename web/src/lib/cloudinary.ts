import { v2 as cloudinary } from "cloudinary";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MIME_TO_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

export async function uploadFile(
  buffer: Buffer,
  options: {
    folder?: string;
    resource_type?: "image" | "raw" | "auto";
    mimeType?: string;
  } = {}
): Promise<{ url: string; publicId: string; mimeType: string }> {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return uploadToLocal(buffer, options);
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? "tour-files",
        resource_type: options.resource_type ?? "auto",
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          mimeType: result.format === "pdf" ? "application/pdf" : `image/${result.format}`,
        });
      }
    );
    uploadStream.end(buffer);
  });
}

async function uploadToLocal(
  buffer: Buffer,
  options: { folder?: string; mimeType?: string }
) {
  const folder = options.folder ?? "tour-files";
  const ext = options.mimeType ? (MIME_TO_EXT[options.mimeType] ?? "bin") : "bin";
  const filename = `${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const relPath = `uploads/${folder}/${filename}`;
  const absDir = join(process.cwd(), "public", "uploads", folder);

  await mkdir(absDir, { recursive: true });
  await writeFile(join(absDir, filename), buffer);

  return {
    url: `/${relPath}`,
    publicId: `local/${relPath}`,
    mimeType: options.mimeType ?? "application/octet-stream",
  };
}

export async function deleteFile(publicId: string, resourceType: "image" | "raw" = "image") {
  if (publicId.startsWith("local/")) {
    const relPath = publicId.slice("local/".length);
    await unlink(join(process.cwd(), "public", relPath)).catch(() => {});
    return;
  }
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
