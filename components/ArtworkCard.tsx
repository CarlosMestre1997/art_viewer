"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { Heart, Box } from "lucide-react";
import { ArtworkWithArtist } from "@/lib/types";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";

const Sculpture3D = dynamic(() => import("./Sculpture3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-100" />,
});

interface Props {
  artwork: ArtworkWithArtist;
  priority?: boolean;
}

export default function ArtworkCard({ artwork, priority = false }: Props) {
  const { lang, favorites, toggleFavorite, rotating } = useApp();
  const isFav = favorites.includes(artwork.id);
  const is3D = !!artwork.model_type;

  return (
    <div className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 flex flex-col group">
      <Link href={`/artwork/${artwork.id}`} className={`block aspect-square overflow-hidden bg-stone-100 relative rotate-scene ${artwork.category === "drawing" ? "pencil-filter" : ""}`}>
        {is3D ? (
          <div className="absolute inset-0">
            <Sculpture3D
              type={artwork.model_type!}
              color={artwork.model_color ?? "#b8a27a"}
              spinning={rotating}
            />
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              width: "100%",
              height: "100%",
              transformStyle: "preserve-3d",
              animation: rotating ? "rc-spin-y 7.2s linear infinite reverse" : undefined,
              willChange: rotating ? "transform" : undefined,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
              }}
            >
              <Image
                src={artwork.image_url}
                alt={artwork.title}
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
                priority={priority}
                loading={priority ? "eager" : "lazy"}
              />
            </div>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <Image
                src={artwork.image_url}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 33vw"
                className="object-cover"
                priority={priority}
                loading={priority ? "eager" : "lazy"}
              />
            </div>
          </div>
        )}

        {/* Category / 3D pill */}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-stone-700 text-[10px] font-medium px-2 py-0.5 rounded-full capitalize flex items-center gap-1">
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
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(artwork.id);
            }}
            aria-label={isFav ? t(lang, "saved") : t(lang, "save")}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
              isFav
                ? "bg-rose-500 text-white"
                : "bg-stone-100 text-stone-400 hover:bg-rose-50 hover:text-rose-400"
            }`}
          >
            <Heart size={15} fill={isFav ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
    </div>
  );
}
