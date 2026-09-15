"use client";

import { useState, useEffect, FormEvent } from "react";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:ring-2 focus:ring-[#D12351] focus:border-transparent";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";

interface Defaults {
  descriptionModel: string;
  descriptionPrompt: string;
  thumbnailPrompt: string;
}

type TestState = { loading: boolean; ok?: boolean; message?: string };

export default function AiSettingsForm() {
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [hasManusKey, setHasManusKey] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [manusApiKey, setManusApiKey] = useState("");
  const [clearGeminiKey, setClearGeminiKey] = useState(false);
  const [clearManusKey, setClearManusKey] = useState(false);
  const [aiDescriptionModel, setAiDescriptionModel] = useState("");
  const [aiDescriptionPrompt, setAiDescriptionPrompt] = useState("");
  const [aiThumbnailPrompt, setAiThumbnailPrompt] = useState("");
  const [aiThumbnailAgentProfile, setAiThumbnailAgentProfile] = useState("standard");
  const [manusThreshold, setManusThreshold] = useState("30");
  const [geminiInputPrice, setGeminiInputPrice] = useState("");
  const [geminiOutputPrice, setGeminiOutputPrice] = useState("");
  const [manusPrice, setManusPrice] = useState("");
  const [defaults, setDefaults] = useState<Defaults | null>(null);
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);

  const [loading, setLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [geminiTest, setGeminiTest] = useState<TestState>({ loading: false });
  const [manusTest, setManusTest] = useState<TestState>({ loading: false });

  useEffect(() => {
    fetch("/api/admin/ai-settings")
      .then((r) => r.json())
      .then(({ data, defaults }) => {
        if (data) {
          setHasGeminiKey(data.hasGeminiKey);
          setHasManusKey(data.hasManusKey);
          setAiDescriptionModel(data.aiDescriptionModel ?? "");
          setAiDescriptionPrompt(data.aiDescriptionPrompt ?? "");
          setAiThumbnailPrompt(data.aiThumbnailPrompt ?? "");
          setAiThumbnailAgentProfile(data.aiThumbnailAgentProfile ?? "standard");
          setManusThreshold(data.aiManusPersonalThreshold != null ? String(data.aiManusPersonalThreshold) : "30");
          setGeminiInputPrice(data.aiGeminiInputPricePerM != null ? String(data.aiGeminiInputPricePerM) : "");
          setGeminiOutputPrice(data.aiGeminiOutputPricePerM != null ? String(data.aiGeminiOutputPricePerM) : "");
          setManusPrice(data.aiManusPricePerCredit != null ? String(data.aiManusPricePerCredit) : "");
          setEncryptionConfigured(data.encryptionConfigured ?? true);
        }
        if (defaults) setDefaults(defaults);
      })
      .finally(() => setLoading(false));
  }, []);

  async function runTest(provider: "gemini" | "manus") {
    const setState = provider === "gemini" ? setGeminiTest : setManusTest;
    const typed = provider === "gemini" ? geminiApiKey : manusApiKey;
    setState({ loading: true });
    try {
      const res = await fetch("/api/admin/ai-settings/test", {
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
      const res = await fetch("/api/admin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey: geminiApiKey.trim() || undefined,
          manusApiKey: manusApiKey.trim() || undefined,
          clearGeminiKey,
          clearManusKey,
          aiDescriptionModel,
          aiDescriptionPrompt,
          aiThumbnailPrompt,
          aiThumbnailAgentProfile,
          aiManusPersonalThreshold: manusThreshold.trim() ? Number(manusThreshold) : undefined,
          aiGeminiInputPricePerM: geminiInputPrice.trim() ? Number(geminiInputPrice) : null,
          aiGeminiOutputPricePerM: geminiOutputPrice.trim() ? Number(geminiOutputPrice) : null,
          aiManusPricePerCredit: manusPrice.trim() ? Number(manusPrice) : null,
        }),
      });
      const { data, error } = await res.json();
      if (data) {
        setSuccess(true);
        setHasGeminiKey(data.hasGeminiKey);
        setHasManusKey(data.hasManusKey);
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
      <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <label className={labelClass}>
          {label}
          <span
            className={`ml-2 text-xs font-normal ${has && !clear ? "text-emerald-600" : "text-gray-400"}`}
          >
            {clear ? "將於儲存後清除" : has ? "● 已設定" : "○ 尚未設定"}
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
          placeholder={has ? "如需更換請輸入新金鑰，留空則不變更" : "貼上 API 金鑰"}
        />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => runTest(provider)}
            disabled={test.loading || (!value.trim() && !has)}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {test.loading ? "測試中…" : "測試金鑰"}
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
            <button
              type="button"
              onClick={() => setClear(false)}
              className="cursor-pointer text-xs text-gray-500 hover:text-gray-700"
            >
              取消清除
            </button>
          )}
          {test.message && (
            <span className={`text-xs ${test.ok ? "text-emerald-600" : "text-rose-600"}`}>
              {test.message}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">AI 設定</h1>
        <p className="mt-1 text-sm text-gray-500">
          設定全站共用的 AI 金鑰與預設提示詞。金鑰加密儲存，永遠不會顯示明文；所有後台使用者皆可使用 AI 生成功能。
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">載入中…</p>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
          {!encryptionConfigured && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              伺服器尚未設定 <code>AI_ENCRYPTION_KEY</code>，無法儲存金鑰。請於環境變數設定 32-byte 金鑰後重啟。
            </p>
          )}

          {keyField("gemini", "Gemini API 金鑰（行程簡介）", hasGeminiKey, geminiApiKey, setGeminiApiKey, clearGeminiKey, setClearGeminiKey, geminiTest)}
          {keyField("manus", "Manus API 金鑰（行程縮圖）", hasManusKey, manusApiKey, setManusApiKey, clearManusKey, setClearManusKey, manusTest)}

          <div>
            <label className={labelClass}>簡介生成模型</label>
            <input
              type="text"
              value={aiDescriptionModel}
              onChange={(e) => setAiDescriptionModel(e.target.value)}
              className={inputClass}
              placeholder={defaults?.descriptionModel ?? "gemini-3.6-flash"}
            />
            <p className="mt-1 text-xs text-gray-400">
              需為支援多模態（可讀 PDF）的 Gemini 模型；建議 {defaults?.descriptionModel ?? "gemini-3.6-flash"}。
            </p>
          </div>

          <div>
            <label className={labelClass}>簡介提示詞範本（系統預設）</label>
            <textarea
              rows={6}
              value={aiDescriptionPrompt}
              onChange={(e) => setAiDescriptionPrompt(e.target.value)}
              className={inputClass}
              placeholder={defaults?.descriptionPrompt}
            />
            <p className="mt-1 text-xs text-gray-400">留空則使用內建預設；使用者可於「AI 偏好」自行覆蓋。</p>
          </div>

          <div>
            <label className={labelClass}>縮圖提示詞範本（系統預設）</label>
            <textarea
              rows={5}
              value={aiThumbnailPrompt}
              onChange={(e) => setAiThumbnailPrompt(e.target.value)}
              className={inputClass}
              placeholder={defaults?.thumbnailPrompt}
            />
            <p className="mt-1 text-xs text-gray-400">留空則使用內建預設；使用者可於「AI 偏好」自行覆蓋。</p>
          </div>

          <div>
            <label className={labelClass}>Manus 縮圖品質（agent profile）</label>
            <select
              value={aiThumbnailAgentProfile}
              onChange={(e) => setAiThumbnailAgentProfile(e.target.value)}
              className={inputClass}
            >
              <option value="lite">lite（輕量，較省 credit）</option>
              <option value="standard">standard（標準，預設）</option>
              <option value="max">max（高品質，較耗 credit）</option>
            </select>
            <p className="mt-1 text-xs text-gray-400">全站預設值；使用者可於「AI 偏好」覆蓋，生成時亦可臨時更換。</p>
          </div>

          <div>
            <label className={labelClass}>Manus 個人額度門檻（credits）</label>
            <input
              type="number"
              min={0}
              step={1}
              value={manusThreshold}
              onChange={(e) => setManusThreshold(e.target.value)}
              className={inputClass}
              placeholder="30"
            />
            <p className="mt-1 text-xs text-gray-400">
              使用者設定個人 Manus 金鑰時，餘額需 ≥ 此門檻才會用個人額度，否則改用公用額度（預設 30）。
            </p>
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-700">
              成本估算單價（選填）
              <span className="ml-2 text-xs font-normal text-gray-400">用於「AI 使用紀錄」的成本估算，留空則不顯示金額</span>
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Gemini 輸入</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={geminiInputPrice}
                  onChange={(e) => setGeminiInputPrice(e.target.value)}
                  className={inputClass}
                  placeholder="NT$ / 每百萬 tokens"
                />
              </div>
              <div>
                <label className={labelClass}>Gemini 輸出</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={geminiOutputPrice}
                  onChange={(e) => setGeminiOutputPrice(e.target.value)}
                  className={inputClass}
                  placeholder="NT$ / 每百萬 tokens"
                />
              </div>
              <div>
                <label className={labelClass}>Manus</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={manusPrice}
                  onChange={(e) => setManusPrice(e.target.value)}
                  className={inputClass}
                  placeholder="NT$ / 每 credit"
                />
              </div>
            </div>
            <p className="text-xs text-gray-400">Gemini 的「思考」tokens 以輸出計價；Manus 目前無法精準歸屬單筆 credit，暫作保留。</p>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">已成功儲存</p>}

          <button
            type="submit"
            disabled={isPending}
            className="cursor-pointer rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: "#D12351" }}
          >
            {isPending ? "儲存中…" : "儲存"}
          </button>
        </form>
      )}
    </div>
  );
}
