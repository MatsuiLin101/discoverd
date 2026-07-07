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
/**
 * Parse a JSON response, but fail with a legible message when the body is not
 * JSON at all (e.g. an HTML 404 / login page or a dev error overlay). Without
 * this guard `res.json()` throws "Unexpected token '<'…", which hides the real
 * cause (session expired, route not registered, server needs a restart).
 */
async function readJson(res: Response, fallback: string): Promise<Record<string, unknown>> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (res.status === 403 || res.status === 401) {
      throw new Error("登入狀態已失效，請重新登入後再試");
    }
    throw new Error(`${fallback}（伺服器回應非預期格式，狀態碼 ${res.status}，請重新整理或重啟開發伺服器後再試）`);
  }
}

export async function uploadFile(file: File, folder: string): Promise<UploadedFile> {
  const presignRes = await fetch("/api/admin/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder, filename: file.name, contentType: file.type }),
  });
  const presignJson = await readJson(presignRes, "取得上傳授權失敗");
  if (!presignRes.ok) {
    throw new Error((presignJson.error as string) ?? "取得上傳授權失敗");
  }

  const { key, uploadUrl, method, headers } = presignJson.data as {
    key: string;
    uploadUrl: string;
    method: "PUT";
    headers: Record<string, string>;
  };

  const putRes = await fetch(uploadUrl, { method, headers, body: file });
  if (!putRes.ok) {
    const putJson = await readJson(putRes, "檔案上傳失敗").catch(() => null);
    throw new Error((putJson?.error as string) ?? "檔案上傳失敗");
  }

  return { key, mimeType: file.type, filename: file.name };
}
