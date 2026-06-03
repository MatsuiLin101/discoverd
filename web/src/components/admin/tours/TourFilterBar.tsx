"use client";

import { useState, useEffect } from "react";
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

export default function TourFilterBar({ regions, tags }: TourFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentQ = searchParams.get("q") ?? "";
  const currentRegionId = searchParams.get("regionId") ?? "";
  const currentSubRegionId = searchParams.get("subRegionId") ?? "";
  const currentTagId = searchParams.get("tagId") ?? "";
  const currentLimit = searchParams.get("limit") ?? "20";

  const [keyword, setKeyword] = useState(currentQ);

  useEffect(() => {
    setKeyword(searchParams.get("q") ?? "");
  }, [searchParams]);

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

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    if (key === "regionId") params.delete("subRegionId");
    params.delete("page");
    router.replace(`/admin/tours?${params.toString()}`);
  }

  const selectedRegion = regions.find((r) => r.id === currentRegionId);
  const subRegions = selectedRegion?.subRegions ?? [];
  const hasFilters = !!(currentQ || currentRegionId || currentSubRegionId || currentTagId);

  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">關鍵字</label>
        <input
          type="search"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜尋方案名稱…"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351]"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">主分類</label>
        <select
          value={currentRegionId}
          onChange={(e) => updateParam("regionId", e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351]"
        >
          <option value="">全部</option>
          {regions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">次分類</label>
        <select
          value={currentSubRegionId}
          onChange={(e) => updateParam("subRegionId", e.target.value)}
          disabled={!currentRegionId}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351] disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">全部</option>
          {subRegions.map((sr) => (
            <option key={sr.id} value={sr.id}>
              {sr.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">標籤</label>
        <select
          value={currentTagId}
          onChange={(e) => updateParam("tagId", e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351]"
        >
          <option value="">全部</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-gray-500">每頁顯示</label>
        <select
          value={currentLimit}
          onChange={(e) => updateParam("limit", e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-[#D12351] focus:outline-none focus:ring-1 focus:ring-[#D12351]"
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
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50"
        >
          清除篩選
        </Link>
      )}
    </div>
  );
}
