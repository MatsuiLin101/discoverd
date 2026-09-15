/**
 * Minimal client for the Manus API (v2). Docs: https://open.manus.im/docs/v2
 *
 * Manus is an asynchronous agent platform, not a synchronous image endpoint:
 *  1. `createThumbnailTask` -> POST /v2/task.create returns a task_id.
 *  2. `getTaskResult`       -> GET /v2/task.listMessages polls until the agent
 *     status is "stopped" (done) or "error"; the produced image arrives as a
 *     message attachment URL.
 *  3. `testManusKey`        -> GET /v2/usage.availableCredits (validity + balance).
 *
 * Auth header is `x-manus-api-key`.
 */

const BASE = "https://api.manus.ai";

function headers(apiKey: string): Record<string, string> {
  return { "x-manus-api-key": apiKey, "Content-Type": "application/json" };
}

/** Validate a key and report the remaining credit balance. */
export async function testManusKey(
  apiKey: string,
): Promise<{ ok: boolean; message: string; credits?: number }> {
  try {
    const res = await fetch(`${BASE}/v2/usage.availableCredits`, { headers: headers(apiKey) });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.ok !== false) {
      const credits: number | undefined =
        body?.total_credits ?? body?.available_credits ?? body?.free_credits ?? body?.credits ?? body?.balance;
      return {
        ok: true,
        message:
          credits != null ? `Manus 金鑰有效，剩餘額度：${credits}` : "Manus API 金鑰有效",
        credits,
      };
    }
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    return { ok: false, message: `Manus 金鑰無效：${detail}` };
  } catch (e) {
    return { ok: false, message: `無法連線 Manus：${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Create an image-generation task. Returns the Manus task id. */
export async function createThumbnailTask(opts: {
  apiKey: string;
  prompt: string;
  agentProfile?: string;
}): Promise<string> {
  const res = await fetch(`${BASE}/v2/task.create`, {
    method: "POST",
    headers: headers(opts.apiKey),
    body: JSON.stringify({
      message: { content: opts.prompt },
      agent_profile: opts.agentProfile ?? "standard",
      locale: "zh-TW",
      hide_in_task_list: true,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.ok === false || !body?.task_id) {
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Manus 建立任務失敗：${detail}`);
  }
  return body.task_id as string;
}

export type ManusTaskState =
  | { status: "pending" }
  | { status: "done"; imageUrl: string }
  | { status: "error"; message: string };

interface ManusAttachment {
  type?: string;
  url?: string;
  content_type?: string;
  filename?: string;
}

/**
 * Poll a task once. Returns "pending" while running, "done" with the first
 * image attachment once the agent stops, or "error".
 */
export async function getTaskResult(opts: {
  apiKey: string;
  taskId: string;
}): Promise<ManusTaskState> {
  const url = `${BASE}/v2/task.listMessages?task_id=${encodeURIComponent(opts.taskId)}`;
  const res = await fetch(url, { headers: headers(opts.apiKey) });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.ok === false) {
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    return { status: "error", message: `Manus 讀取任務失敗：${detail}` };
  }

  const messages: Array<Record<string, unknown>> = body?.messages ?? [];

  // Latest known agent status, if any status_update event is present.
  let agentStatus: string | undefined;
  for (const m of messages) {
    const su = (m.status_update ?? m["status_update"]) as { agent_status?: string } | undefined;
    if (su?.agent_status) agentStatus = su.agent_status;
  }

  // Collect image attachments across assistant messages.
  const imageUrls: string[] = [];
  for (const m of messages) {
    const am = (m.assistant_message ?? {}) as { attachments?: ManusAttachment[] };
    for (const att of am.attachments ?? []) {
      const isImage =
        att.content_type?.startsWith("image/") ||
        att.type === "image" ||
        /\.(png|jpe?g|webp|gif)$/i.test(att.filename ?? att.url ?? "");
      if (isImage && att.url) imageUrls.push(att.url);
    }
  }

  // Return the image as soon as one exists — the Manus agent often keeps
  // "running" (writing a summary) for minutes after the picture is ready, so
  // waiting for "stopped" would make the user wait needlessly.
  if (imageUrls.length > 0) {
    return { status: "done", imageUrl: imageUrls[imageUrls.length - 1] };
  }
  if (agentStatus === "error") {
    return { status: "error", message: "Manus 任務執行失敗" };
  }
  if (agentStatus === "stopped") {
    return { status: "error", message: "Manus 任務完成但沒有產生圖片" };
  }
  return { status: "pending" };
}
