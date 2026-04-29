"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Heart, Box } from "lucide-react";
import { ArtworkWithArtist } from "@/lib/types";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { getImageUrl } from "@/lib/supabase";

// Warm off-white used by both Sculpture3D and GLBViewer — keep in sync.
const CARD_BG = "#faf7f1";

const Sculpture3D = dynamic(() => import("./Sculpture3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: CARD_BG }} />,
});

const GLBViewer = dynamic(() => import("./GLBViewer"), {
  ssr: false,
  // While the JS chunk + GLB file load, show the primary image so the card
  // isn't blank on first page visit.
  loading: () => <div className="w-full h-full" style={{ background: CARD_BG }} />,
});

interface Props {
  artwork: ArtworkWithArtist;
  priority?: boolean;
}

export default function ArtworkCard({ artwork, priority = false }: Props) {
  const { lang, favorites, toggleFavorite } = useApp();
  const isFav = favorites.includes(artwork.id);
  const hasProcedural3D = !!artwork.model_type;
  const hasUploadedGLB = !!artwork.model_path;
  const is3D = hasProcedural3D || hasUploadedGLB;
  const imgFit = artwork.image_fit ?? "cover";

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col group">
      <Link
        href={`/artwork/${artwork.id}`}
        className={`block aspect-square overflow-hidden relative rotate-scene ${
          !is3D && artwork.category === "drawing" ? "pencil-filter" : ""
        }`}
        style={{ background: CARD_BG }}
      >
        {hasProcedural3D ? (
          <div className="absolute inset-0">
            <Sculpture3D
              type={artwork.model_type!}
              color={artwork.model_color ?? "#b8a27a"}
              spinning
            />
          </div>
        ) : hasUploadedGLB ? (
          <div className="absolute inset-0">
            {/*
              Primary image sits underneath — visible immediately while the GLB
              JS chunk + network file load. GLBViewer's canvas covers it once
              ready (its background colour matches, so there's no visible swap).
            */}
            {artwork.image_url && artwork.image_url !== "/placeholder.jpg" && (
              <Image
                src={artwork.image_url}
                alt={artwork.title}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className={`${imgFit === "contain" ? "object-contain" : "object-cover"}`}
                priority={priority}
              />
            )}
            <div className="absolute inset-0">
              <GLBViewer
                url={getImageUrl(artwork.model_path!)}
                spinning
                scale={artwork.model_scale ?? 1}
              />
            </div>
          </div>
        ) : (
          <Image
            src={artwork.image_url}
            alt={artwork.title}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className={imgFit === "contain" ? "object-contain" : "object-cover"}
            priority={priority}
          />
        )}

        {/* Category / 3D pill */}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-stone-700 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize flex items-center gap-1 z-10">
          {is3D && <Box size={10} />}
          {t(lang, artwork.category as keyof typeof import("@/lib/i18n").translations.en)}
        </span>
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-[11px] text-stone-400 truncate">{artwork.artist.name}</p>
        <p className="text-sm font-semibold text-stone-900 leading-snug mt-0.5 line-clamp-2">
          {artwork.title}
        </p>
        <p className="text-[11px] text-stone-400 mt-1">{artwork.year}</p>

        <div className="flex items-center justify-between mt-auto pt-2">
          <span className="text-sm font-bold text-stone-900">
            €{artwork.price.toLocaleString()}
          </span>
          <button
            onClick={(e) => { e.preventDefault(); toggleFavorite(artwork.id); }}
            aria-label={isFav ? t(lang, "saved") : t(lang, "save")}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
              isFav ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-400 hover:bg-rose-50 hover:text-rose-400"
            }`}
          >
            <Heart size={15} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}
