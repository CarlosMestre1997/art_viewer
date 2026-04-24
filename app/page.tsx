"use client";

import { useMemo, useState } from "react";
import { getAllArtworks } from "@/lib/data";
import { FilterCategory, PriceRange, SortOption } from "@/lib/types";
import FilterBar from "@/components/FilterBar";
import ArtworkCard from "@/components/ArtworkCard";

const ALL_ARTWORKS = getAllArtworks();

const PRICE_BOUNDS: Record<PriceRange, [number, number]> = {
  any: [0, Infinity],
  u500: [0, 500],
  "500_1500": [500, 1500],
  "1500_3000": [1500, 3000],
  o3000: [3000, Infinity],
};

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FilterCategory>("all");
  const [sort, setSort] = useState<SortOption>("year_desc");
  const [priceRange, setPriceRange] = useState<PriceRange>("any");

  const filtered = useMemo(() => {
    let list = ALL_ARTWORKS;

    if (category !== "all") {
      list = list.filter((a) => a.category === category);
    }

    const [min, max] = PRICE_BOUNDS[priceRange];
    if (priceRange !== "any") {
      list = list.filter((a) => a.price >= min && a.price <= max);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.artist.name.toLowerCase().includes(q) ||
          a.technique.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "year_desc") return b.year - a.year;
      if (sort === "artist_az") return a.artist.name.localeCompare(b.artist.name);
      return 0;
    });
  }, [search, category, sort, priceRange]);

  return (
    <>
      <FilterBar
        search={search}
        onSearch={setSearch}
        category={category}
        onCategory={setCategory}
        sort={sort}
        onSort={setSort}
        priceRange={priceRange}
        onPriceRange={setPriceRange}
        count={filtered.length}
        total={ALL_ARTWORKS.length}
      />

      <div className="px-4 pt-4">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400 text-sm">
            No artworks match your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((aw, i) => (
              <ArtworkCard
                key={aw.model_type ? `${aw.id}-${sort}` : aw.id}
                artwork={aw}
                priority={i < 4}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
