"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAdminPath } from "@/components/admin/AdminPathProvider";
import { compareTagName } from "@/lib/tag-sort";

type FilterRegion = {
  id: string;
  name: string;
  subRegions: { id: string; name: string }[];
};

type TagOption = { id: string; name: string };

interface TourFilterBarProps {
  regions: FilterRegion[];
  tags: TagOption[];
}

const PAGE_SIZE_OPTIONS = [
  { value: "10", label: "10 筆" },
  { value: "20", label: "20 筆" },
  { value: "50", label: "50 筆" },
  { value: "100", label: "100 筆" },
  { value: "0", label: "全部" },
];

const controlH = "h-[34px]";
const selectClass =
  `${controlH} rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#D12351] focus:ring-1 focus:ring-[#D12351]`;
const labelClass = "text-xs font-medium text-gray-500";

export default function TourFilterBar({ regions, tags }: TourFilterBarProps) {
  const router = useRouter();
  const adminPath = useAdminPath();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentRegionId = searchParams.get("regionId") ?? "";
  const currentSubRegionId = searchParams.get("subRegionId") ?? "";
  const currentTagIds = (searchParams.get("tagIds") ?? "").split(",").filter(Boolean);
  const currentPublished = searchParams.get("published") ?? "";
  const currentLimit = searchParams.get("limit") ?? "20";

  const [keyword, setKeyword] = useState(currentQ);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    setKeyword(searchParams.get("q") ?? "");
  }, [searchParams]);

  // Keyword debounce
  useEffect(() => {
    const urlQ = new URLSearchParams(searchParams.toString()).get("q") ?? "";
    if (keyword === urlQ) return;
    const id = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (keyword) params.set("q", keyword);
      else params.delete("q");
      params.delete("page");
      router.replace(`${adminPath}/tours?${params.toString()}`);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "regionId") params.delete("subRegionId");
    params.delete("page");
    router.replace(`${adminPath}/tours?${params.toString()}`);
  }

  function toggleTagId(tagId: string) {
    const next = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set("tagIds", next.join(","));
    else params.delete("tagIds");
    params.delete("page");
    router.replace(`${adminPath}/tours?${params.toString()}`);
  }

  const selectedRegion = regions.find((r) => r.id === currentRegionId);
  const subRegions = selectedRegion?.subRegions ?? [];

  const hasFilters = !!(currentQ || currentRegionId || currentSubRegionId || currentTagIds.length > 0 || currentPublished);

  // Sorted like the tour form (text + numeric collation).
  const sortedTags = [...tags].sort((a, b) => compareTagName(a.name, b.name));
  const tagQuery = tagSearch.trim().toLowerCase();
  // Selected chips always show; the rest are filtered by the search text.
  const visibleTags = tagQuery
    ? sortedTags.filter(
        (t) => currentTagIds.includes(t.id) || t.name.toLowerCase().includes(tagQuery)
      )
    : sortedTags;

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* 關鍵字 */}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>關鍵字</label>
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜尋方案名稱…"
            className={`${controlH} rounded-lg border border-gray-300 bg-white px-3 text-sm outline-none transition focus:border-[#D12351] focus:ring-1 focus:ring-[#D12351]`}
          />
        </div>

        {/* 主分類 */}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>主分類</label>
          <select
            value={currentRegionId}
            onChange={(e) => updateParam("regionId", e.target.value)}
            className={selectClass}
          >
            <option value="">全部</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {/* 次分類 */}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>次分類</label>
          <select
            value={currentSubRegionId}
            onChange={(e) => updateParam("subRegionId", e.target.value)}
            disabled={!currentRegionId}
            className={`${selectClass} disabled:bg-gray-100 disabled:text-gray-400`}
          >
            <option value="">全部</option>
            {subRegions.map((sr) => (
              <option key={sr.id} value={sr.id}>
                {sr.name}
              </option>
            ))}
          </select>
        </div>

        {/* 標籤：展開/收起的多選區塊（區塊本體在篩選列下方） */}
        {tags.length > 0 && (
          <div className="flex flex-col gap-1">
            <label className={labelClass}>標籤</label>
            <button
              onClick={() => setTagPanelOpen((o) => !o)}
              aria-expanded={tagPanelOpen}
              className={`${controlH} flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-sm outline-none transition whitespace-nowrap ${
                currentTagIds.length > 0
                  ? "border-[#D12351] bg-rose-50 text-[#D12351]"
                  : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
              }`}
            >
              {currentTagIds.length > 0 ? `標籤 (${currentTagIds.length})` : "標籤"}
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className={`transition-transform ${tagPanelOpen ? "rotate-180" : ""}`}
              >
                <path d="M2 4l4 4 4-4" />
              </svg>
            </button>
          </div>
        )}

        {/* 發布狀態 */}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>發布狀態</label>
          <div className={`${controlH} flex items-center rounded-lg border border-gray-200 bg-gray-100 p-0.5 gap-0.5`}>
            {(
              [
                {
                  val: "",
                  label: "全部",
                  activeClass: "bg-white text-gray-800 shadow-sm",
                  inactiveClass: "text-gray-500 hover:text-gray-700",
                },
                {
                  val: "true",
                  label: "已發布",
                  activeClass: "bg-emerald-500 text-white shadow-sm",
                  inactiveClass: "text-gray-500 hover:text-emerald-600",
                },
                {
                  val: "false",
                  label: "未發布",
                  activeClass: "bg-gray-400 text-white shadow-sm",
                  inactiveClass: "text-gray-500 hover:text-gray-600",
                },
              ]
            ).map(({ val, label, activeClass, inactiveClass }) => (
              <button
                key={val}
                onClick={() => updateParam("published", val)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  currentPublished === val ? activeClass : inactiveClass
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 每頁顯示 */}
        <div className="flex flex-col gap-1">
          <label className={labelClass}>每頁顯示</label>
          <select
            value={currentLimit}
            onChange={(e) => updateParam("limit", e.target.value)}
            className={selectClass}
          >
            {PAGE_SIZE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <Link
            href={`${adminPath}/tours`}
            className={`${controlH} flex items-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50`}
          >
            清除篩選
          </Link>
        )}
      </div>

      {/* 標籤選擇區塊：展開時顯示（搜尋 + 點擊 chip 多選，同行程表單） */}
      {tags.length > 0 && tagPanelOpen && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          <input
            type="search"
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            placeholder="搜尋標籤…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition placeholder:text-gray-300 focus:border-transparent focus:ring-2 focus:ring-[#D12351] sm:max-w-xs"
          />
          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag) => {
                const checked = currentTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTagId(tag.id)}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? "border-[#D12351] bg-rose-50 text-[#D12351]"
                        : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-gray-400">沒有符合的標籤。</p>
          )}
          {currentTagIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("tagIds");
                params.delete("page");
                router.replace(`${adminPath}/tours?${params.toString()}`);
              }}
              className="cursor-pointer text-xs text-gray-400 hover:text-gray-600"
            >
              清除標籤選取
            </button>
          )}
        </div>
      )}
    </div>
  );
}
