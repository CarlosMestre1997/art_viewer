"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getAllArtworks } from "@/lib/data";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import ArtworkCard from "@/components/ArtworkCard";
import { ArtworkWithArtist } from "@/lib/types";

export default function FavoritesPage() {
  const { lang, favorites } = useApp();
  const [artworks, setArtworks] = useState<ArtworkWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadArtworks();
  }, []);

  async function loadArtworks() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllArtworks();
      setArtworks(data);
    } catch {
      setError(t(lang, "error_loading"));
    } finally {
      setLoading(false);
    }
  }

  const saved = artworks.filter((a) => favorites.includes(a.id));

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-bold text-stone-900 mb-4 flex items-center gap-2">
        <Heart size={20} className="text-rose-500" fill="currentColor" />
        {t(lang, "favorites")}
      </h1>

      {error ? (
        <div className="text-center py-20">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={loadArtworks}
            className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium"
          >
            {t(lang, "retry")}
          </button>
        </div>
      ) : loading ? (
        <div className="text-center py-20 text-stone-400 text-sm">Loading...</div>
      ) : saved.length === 0 ? (
        <div className="text-center py-20">
          <Heart size={40} className="text-stone-200 mx-auto mb-4" />
          <p className="text-stone-500 font-medium">{t(lang, "no_favorites")}</p>
          <p className="text-stone-400 text-sm mt-1">{t(lang, "no_favorites_sub")}</p>
          <Link
            href="/"
            className="inline-block mt-6 px-6 py-3 bg-stone-900 text-white rounded-full text-sm font-medium"
          >
            {t(lang, "browse")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {saved.map((aw) => (
            <ArtworkCard key={aw.id} artwork={aw} />
          ))}
        </div>
      )}
    </div>
  );
}
