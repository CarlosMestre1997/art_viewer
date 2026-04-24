"use client";

import { useState } from "react";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { FilterCategory, PriceRange, SortOption } from "@/lib/types";
import { SlidersHorizontal, ChevronDown, RotateCw } from "lucide-react";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  category: FilterCategory;
  onCategory: (v: FilterCategory) => void;
  sort: SortOption;
  onSort: (v: SortOption) => void;
  priceRange: PriceRange;
  onPriceRange: (v: PriceRange) => void;
  count: number;
  total: number;
}

const CATEGORIES: FilterCategory[] = ["all", "painting", "sculpture", "ceramic", "photography", "mixed_media", "drawing"];
const SORTS: SortOption[] = ["price_asc", "price_desc", "year_desc", "artist_az"];
const PRICE_RANGES: PriceRange[] = ["any", "u500", "500_1500", "1500_3000", "o3000"];

export default function FilterBar({ search, onSearch, category, onCategory, sort, onSort, priceRange, onPriceRange, count, total }: Props) {
  const { lang, rotating, setRotating } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white border-b border-stone-100 px-4 pb-3 max-w-2xl mx-auto">
      {/* Search */}
      <div className="relative mt-3">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t(lang, "search")}
          className="w-full pl-4 pr-4 py-2.5 rounded-xl bg-stone-100 text-sm text-stone-900 placeholder:text-stone-400 outline-none focus:ring-2 focus:ring-stone-300"
        />
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between mt-2.5 gap-2">
        <div className="flex items-center gap-2 flex-1">
          {/* Filter dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-100 text-xs font-medium text-stone-700 hover:bg-stone-200 transition-colors"
            >
              <SlidersHorizontal size={13} />
              {t(lang, category === "all" ? "filters" : category)}
              <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="absolute top-full left-0 mt-1.5 bg-white rounded-xl shadow-xl border border-stone-100 z-30 min-w-[190px] py-2 overflow-hidden">
                <div className="px-3 py-1 text-[10px] text-stone-400 uppercase tracking-widest font-medium">
                  {t(lang, "category")}
                </div>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => { onCategory(cat); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      category === cat ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {t(lang, cat as keyof typeof import("@/lib/i18n").translations.en)}
                  </button>
                ))}

                <div className="my-2 border-t border-stone-100" />
                <div className="px-3 py-1 text-[10px] text-stone-400 uppercase tracking-widest font-medium">
                  {t(lang, "price_range")}
                </div>
                {PRICE_RANGES.map((p) => (
                  <button
                    key={p}
                    onClick={() => { onPriceRange(p); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      priceRange === p ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {t(lang, p as keyof typeof import("@/lib/i18n").translations.en)}
                  </button>
                ))}

                <div className="my-2 border-t border-stone-100" />
                <div className="px-3 py-1 text-[10px] text-stone-400 uppercase tracking-widest font-medium">
                  {t(lang, "sort")}
                </div>
                {SORTS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { onSort(s); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      sort === s ? "bg-stone-900 text-white" : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {t(lang, s as keyof typeof import("@/lib/i18n").translations.en)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rotate button */}
          <button
            onClick={() => setRotating(!rotating)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              rotating
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
            title="Rotate artworks"
          >
            <RotateCw size={13} className={rotating ? "animate-spin-slow" : ""} />
            {t(lang, rotating ? "rotating" : "rotate")}
          </button>
        </div>

        <span className="text-xs text-stone-400 whitespace-nowrap shrink-0">
          {count} {t(lang, "artworks")}
        </span>
      </div>
    </div>
  );
}
