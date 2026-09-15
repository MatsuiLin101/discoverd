"use client";

import { useState, useEffect, FormEvent } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

interface Defaults {
  descriptionModel: string;
  descriptionPrompt: string;
  thumbnailPrompt: string;
  thumbnailAgentProfile: string;
}

type TestState = { loading: boolean; ok?: boolean; message?: string };

export default function AiPreferencesForm() {
  const [descriptionModel, setDescriptionModel] = useState("");
  const [descriptionPrompt, setDescriptionPrompt] = useState("");
  const [thumbnailPrompt, setThumbnailPrompt] = useState("");
  const [thumbnailAgentProfile, setThumbnailAgentProfile] = useState("");
  const [defaults, setDefaults] = useState<Defaults | null>(null);

  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasManusKey, setHasManusKey] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [manusApiKey, setManusApiKey] = useState("");
  const [clearGeminiKey, setClearGeminiKey] = useState(false);
  const [clearManusKey, setClearManusKey] = useState(false);
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);
  const [geminiTest, setGeminiTest] = useState<TestState>({ loading: false });
  const [manusTest, setManusTest] = useState<TestState>({ loading: false });

  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/admin/ai/preferences")
      .then((r) => r.json())
      .then(({ data, systemDefaults }) => {
        if (data) {
          setDescriptionModel(data.descriptionModel ?? "");
          setDescriptionPrompt(data.descriptionPrompt ?? "");
          setThumbnailPrompt(data.thumbnailPrompt ?? "");
          setThumbnailAgentProfile(data.thumbnailAgentProfile ?? "");
          setHasGeminiKey(!!data.hasGeminiKey);
          setHasManusKey(!!data.hasManusKey);
          setEncryptionConfigured(data.encryptionConfigured ?? true);
        }
        if (systemDefaults) setDefaults(systemDefaults);
      })
      .finally(() => setLoading(false));
  }, []);

  async function runTest(provider: "gemini" | "manus") {
    const setState = provider === "gemini" ? setGeminiTest : setManusTest;
    const typed = provider === "gemini" ? geminiApiKey : manusApiKey;
    setState({ loading: true });
    try {
      const res = await fetch("/api/admin/ai/preferences/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: typed.trim() || undefined }),
      });
      const { data, error } = await res.json();
      if (data) setState({ loading: false, ok: data.ok, message: data.message });
      else setState({ loading: false, ok: false, message: error ?? "測試失敗" });
    } catch {
      setState({ loading: false, ok: false, message: "網路錯誤，請稍後再試" });
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/admin/ai/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descriptionModel,
          descriptionPrompt,
          thumbnailPrompt,
          thumbnailAgentProfile,
          geminiApiKey: geminiApiKey.trim() || undefined,
          manusApiKey: manusApiKey.trim() || undefined,
          clearGeminiKey,
          clearManusKey,
        }),
      });
      const { data, error } = await res.json();
      if (data) {
        setSuccess(true);
        setDescriptionModel(data.descriptionModel ?? "");
        setDescriptionPrompt(data.descriptionPrompt ?? "");
        setThumbnailPrompt(data.thumbnailPrompt ?? "");
        setThumbnailAgentProfile(data.thumbnailAgentProfile ?? "");
        setHasGeminiKey(!!data.hasGeminiKey);
        setHasManusKey(!!data.hasManusKey);
        setGeminiApiKey("");
        setManusApiKey("");
        setClearGeminiKey(false);
        setClearManusKey(false);
      } else {
        setError(error ?? "儲存失敗");
      }
    } catch {
      setError("網路錯誤，請稍後再試");
    } finally {
      setIsPending(false);
    }
  }

  function resetAll() {
    setDescriptionModel("");
    setDescriptionPrompt("");
    setThumbnailPrompt("");
    setThumbnailAgentProfile("");
  }

  function keyField(
    provider: "gemini" | "manus",
    label: string,
    has: boolean,
    value: string,
    setValue: (v: string) => void,
    clear: boolean,
    setClear: (v: boolean) => void,
    test: TestState,
  ) {
    return (
      <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
        <label className={labelClass}>
          {label}
          <span className={`ml-2 text-xs font-normal ${has && !clear ? "text-emerald-600" : "text-gray-400"}`}>
            {clear ? "將於儲存後清除" : has ? "● 已設定" : "○ 未設定（使用公用額度）"}
          </span>
        </label>
        <input
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (e.target.value) setClear(false);
          }}
          className={inputClass}
          placeholder={has ? "如需更換請輸入新金鑰，留空則不變更" : "貼上你的個人 API 金鑰"}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => runTest(provider)}
            disabled={test.loading || (!value.trim() && !has)}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {test.loading ? "測試中…" : provider === "manus" ? "測試 / 查看餘額" : "測試金鑰"}
          </button>
          {has && !clear && (
            <button
              type="button"
              onClick={() => {
                setClear(true);
                setValue("");
              }}
              className="cursor-pointer text-xs text-rose-500 hover:text-rose-700"
            >
              清除金鑰
            </button>
          )}
          {clear && (
            <button type="button" onClick={() => setClear(false)} className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
              取消清除
            </button>
          )}
          {test.message && (
            <span className={`text-xs ${test.ok ? "text-emerald-600" : "text-rose-600"}`}>{test.message}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">AI 偏好</h1>
        <p className="mt-1 text-sm text-gray-500">
          設定你個人慣用的模型與提示詞；留空的欄位會沿用系統預設。此設定僅套用於你自己的帳號。
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">載入中…</p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <p className="text-sm font-medium text-gray-700">個人 API 金鑰（選填）</p>
              <p className="mt-0.5 text-xs text-gray-400">
                設定後會優先使用你自己的額度；Gemini 額度用完（或金鑰無效）、Manus 餘額不足時，會自動改用公用額度、不中斷。金鑰加密儲存，不會顯示明文。
              </p>
            </div>
            {!encryptionConfigured && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                伺服器尚未設定 <code>AI_ENCRYPTION_KEY</code>，無法儲存金鑰。
              </p>
            )}
            {keyField("gemini", "個人 Gemini 金鑰", hasGeminiKey, geminiApiKey, setGeminiApiKey, clearGeminiKey, setClearGeminiKey, geminiTest)}
            {keyField("manus", "個人 Manus 金鑰", hasManusKey, manusApiKey, setManusApiKey, clearManusKey, setClearManusKey, manusTest)}
          </div>

          <div>
            <label className={labelClass}>簡介生成模型</label>
            <input
              type="text"
              value={descriptionModel}
              onChange={(e) => setDescriptionModel(e.target.value)}
              className={inputClass}
              placeholder={`系統預設：${defaults?.descriptionModel ?? "gemini-3.6-flash"}`}
            />
          </div>

          <div>
            <label className={labelClass}>簡介提示詞</label>
            <textarea
              rows={6}
              value={descriptionPrompt}
              onChange={(e) => setDescriptionPrompt(e.target.value)}
              className={inputClass}
              placeholder={defaults?.descriptionPrompt}
            />
          </div>

          <div>
            <label className={labelClass}>縮圖提示詞</label>
            <textarea
              rows={5}
              value={thumbnailPrompt}
              onChange={(e) => setThumbnailPrompt(e.target.value)}
              className={inputClass}
              placeholder={defaults?.thumbnailPrompt}
            />
          </div>

          <div>
            <label className={labelClass}>Manus 縮圖品質（agent profile）</label>
            <select
              value={thumbnailAgentProfile}
              onChange={(e) => setThumbnailAgentProfile(e.target.value)}
              className={inputClass}
            >
              <option value="">沿用系統預設（{defaults?.thumbnailAgentProfile ?? "standard"}）</option>
              <option value="lite">lite（輕量，較省 credit）</option>
              <option value="standard">standard（標準）</option>
              <option value="max">max（高品質，較耗 credit）</option>
            </select>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">已成功儲存</p>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: "#D12351" }}
            >
              {isPending ? "儲存中…" : "儲存"}
            </button>
            <button
              type="button"
              onClick={resetAll}
              className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
            >
              全部還原為系統預設
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
