"use client";

import Link from "next/link";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { Heart, Globe } from "lucide-react";

export default function Navbar() {
  const { lang, setLang, favorites } = useApp();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-stone-200">
      <div className="flex items-center justify-between px-4 h-14 max-w-2xl mx-auto">
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-bold text-base tracking-tight text-stone-900">
            {t(lang, "appName")}
          </span>
          <span className="text-[10px] text-stone-400 uppercase tracking-widest">
            {t(lang, "tagline")}
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setLang(lang === "en" ? "lv" : "en")}
            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors"
            aria-label="Switch language"
          >
            <Globe size={15} />
            <span className="font-medium uppercase">{lang === "en" ? "LV" : "EN"}</span>
          </button>

          <Link
            href="/favorites"
            className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-stone-100 transition-colors"
            aria-label={t(lang, "favorites")}
          >
            <Heart size={20} className="text-stone-700" />
            {favorites.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {favorites.length}
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  );
}
