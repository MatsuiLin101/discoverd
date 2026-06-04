"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentRegionId = searchParams.get("regionId") ?? "";
  const currentSubRegionId = searchParams.get("subRegionId") ?? "";
  const currentTagIds = (searchParams.get("tagIds") ?? "").split(",").filter(Boolean);
  const currentPublished = searchParams.get("published") ?? "";
  const currentLimit = searchParams.get("limit") ?? "20";

  const [keyword, setKeyword] = useState(currentQ);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tagDropdownRef = useRef<HTMLDivElement>(null);

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
      router.replace(`/admin/tours?${params.toString()}`);
    }, 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword]);

  // Close tag dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
    }
    if (tagDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [tagDropdownOpen]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "regionId") params.delete("subRegionId");
    params.delete("page");
    router.replace(`/admin/tours?${params.toString()}`);
  }

  function toggleTagId(tagId: string) {
    const next = currentTagIds.includes(tagId)
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length > 0) params.set("tagIds", next.join(","));
    else params.delete("tagIds");
    params.delete("page");
    router.replace(`/admin/tours?${params.toString()}`);
  }

  const selectedRegion = regions.find((r) => r.id === currentRegionId);
  const subRegions = selectedRegion?.subRegions ?? [];

  const hasFilters = !!(currentQ || currentRegionId || currentSubRegionId || currentTagIds.length > 0 || currentPublished);

  const visibleTags = tagSearch
    ? tags.filter((t) => t.name.includes(tagSearch))
    : tags;

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

        {/* 標籤多選 */}
        {tags.length > 0 && (
          <div className="flex flex-col gap-1" ref={tagDropdownRef}>
            <label className={labelClass}>標籤</label>
            <div className="relative">
              <button
                onClick={() => { setTagDropdownOpen((o) => !o); setTagSearch(""); }}
                className={`${controlH} flex items-center gap-1.5 rounded-lg border px-3 text-sm outline-none transition whitespace-nowrap ${
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
                  className={`transition-transform ${tagDropdownOpen ? "rotate-180" : ""}`}
                >
                  <path d="M2 4l4 4 4-4" />
                </svg>
              </button>

              {tagDropdownOpen && (
                <div className="absolute top-full left-0 z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="p-2">
                    {tags.length > 6 && (
                      <input
                        type="search"
                        value={tagSearch}
                        onChange={(e) => setTagSearch(e.target.value)}
                        placeholder="搜尋標籤…"
                        className="mb-2 w-full rounded-lg border border-gray-200 px-2 py-1 text-xs outline-none focus:border-[#D12351] focus:ring-1 focus:ring-[#D12351]"
                      />
                    )}
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {visibleTags.length === 0 && (
                        <p className="px-2 py-1.5 text-xs text-gray-400">
                          {tagSearch ? "無符合標籤" : "尚無標籤"}
                        </p>
                      )}
                      {visibleTags.map((tag) => (
                        <label
                          key={tag.id}
                          className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={currentTagIds.includes(tag.id)}
                            onChange={() => toggleTagId(tag.id)}
                            className="h-3.5 w-3.5 rounded border-gray-300 accent-[#D12351]"
                          />
                          <span className="text-gray-700">{tag.name}</span>
                        </label>
                      ))}
                    </div>
                    {currentTagIds.length > 0 && (
                      <button
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString());
                          params.delete("tagIds");
                          params.delete("page");
                          router.replace(`/admin/tours?${params.toString()}`);
                          setTagDropdownOpen(false);
                        }}
                        className="mt-2 w-full rounded-lg py-1 text-xs text-gray-400 hover:text-gray-600"
                      >
                        清除標籤選取
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
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
            href="/admin/tours"
            className={`${controlH} flex items-center rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-600 transition-colors hover:bg-gray-50`}
          >
            清除篩選
          </Link>
        )}
      </div>
    </div>
  );
}
