export interface UploadedFile {
  key: string;
  mimeType: string;
  filename: string;
}

/**
 * Upload a file from the browser:
 *  1. ask the App for upload authorization (key + destination),
 *  2. PUT the file directly to that destination (R2 presigned URL, or the
 *     local upload route),
 *  3. return the stored key (the DB only ever stores keys).
 */
export async function uploadFile(file: File, folder: string): Promise<UploadedFile> {
  const presignRes = await fetch("/api/admin/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, filename: file.name, contentType: file.type }),
  });
  const presignJson = await presignRes.json();
  if (!presignRes.ok) {
    throw new Error(presignJson.error ?? "取得上傳授權失敗");
  }

  const { key, uploadUrl, method, headers } = presignJson.data as {
    key: string;
    uploadUrl: string;
    method: "PUT";
    headers: Record<string, string>;
  };

  const putRes = await fetch(uploadUrl, { method, headers, body: file });
  if (!putRes.ok) {
    throw new Error("檔案上傳失敗");
  }

  return { key, mimeType: file.type, filename: file.name };
}
