"use client";

import { use, useState } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Heart, ChevronLeft, Info, RotateCw } from "lucide-react";
import { getArtworkById, getSimilarArtworks } from "@/lib/data";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import InterestModal from "@/components/InterestModal";
import ArtworkCard from "@/components/ArtworkCard";

const Sculpture3D = dynamic(() => import("@/components/Sculpture3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-100" />,
});

interface Props {
  params: Promise<{ id: string }>;
}

export default function ArtworkDetailPage({ params }: Props) {
  const { id } = use(params);
  const artwork = getArtworkById(id);
  if (!artwork) notFound();

  const similar = getSimilarArtworks(id);
  const { lang, favorites, toggleFavorite, infoLevel, setInfoLevel } = useApp();
  const isFav = favorites.includes(artwork.id);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailSpin, setDetailSpin] = useState(true);
  const is3D = !!artwork.model_type;

  return (
    <div className="pb-8">
      {/* Back */}
      <div className="px-4 pt-4 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors"
        >
          <ChevronLeft size={16} />
          {t(lang, "back")}
        </Link>
      </div>

      {/* Main image or 3D model */}
      <div className={`relative aspect-square w-full bg-stone-100 overflow-hidden ${artwork.category === "drawing" ? "pencil-filter" : ""}`}>
        {is3D ? (
          <>
            <Sculpture3D
              type={artwork.model_type!}
              color={artwork.model_color ?? "#b8a27a"}
              spinning={detailSpin}
            />
            <button
              onClick={() => setDetailSpin((s) => !s)}
              className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
              aria-label="Toggle rotation"
            >
              <RotateCw size={16} className={detailSpin ? "text-stone-900" : "text-stone-400"} />
            </button>
            <span className="absolute top-3 left-3 bg-stone-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-widest uppercase">
              3D
            </span>
          </>
        ) : (
          <Image
            src={artwork.image_url}
            alt={artwork.title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        )}
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <button
          onClick={() => toggleFavorite(artwork.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
            isFav
              ? "bg-rose-500 text-white"
              : "bg-stone-100 text-stone-700 hover:bg-stone-200"
          }`}
        >
          <Heart size={16} fill={isFav ? "currentColor" : "none"} />
          {t(lang, isFav ? "saved" : "save")}
        </button>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
        >
          {t(lang, "interested")}
        </button>
      </div>

      {/* Info */}
      <div className="px-4 pt-5">
        <p className="text-sm text-stone-400 font-medium">{artwork.artist.name}</p>
        <h1 className="text-2xl font-bold text-stone-900 mt-0.5 leading-snug">
          {artwork.title}
        </h1>
        <p className="text-stone-500 text-sm mt-1 italic">{artwork.year}</p>

        <div className="mt-4 text-2xl font-bold text-stone-900">
          €{artwork.price.toLocaleString()}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: t(lang, "technique"), value: artwork.technique },
            { label: t(lang, "size"), value: artwork.size },
          ].map(({ label, value }) => (
            <div key={label} className="bg-stone-100 rounded-xl px-3 py-2.5">
              <p className="text-[10px] text-stone-400 uppercase tracking-wider font-medium">{label}</p>
              <p className="text-sm text-stone-800 mt-0.5 font-medium">{value}</p>
            </div>
          ))}
        </div>

        {/* Info level toggle */}
        <div className="flex items-center gap-2 mt-5">
          <Info size={14} className="text-stone-400" />
          <div className="flex rounded-lg bg-stone-100 p-0.5 text-xs font-medium">
            {(["beginner", "advanced"] as const).map((level) => (
              <button
                key={level}
                onClick={() => setInfoLevel(level)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  infoLevel === level ? "bg-white text-stone-900 shadow-sm" : "text-stone-400"
                }`}
              >
                {t(lang, level)}
              </button>
            ))}
          </div>
        </div>

        {infoLevel === "beginner" ? (
          <p className="mt-3 text-stone-600 text-sm leading-relaxed">
            {artwork.description.split(".")[0]}.
          </p>
        ) : (
          <p className="mt-3 text-stone-600 text-sm leading-relaxed">
            {artwork.description}
          </p>
        )}

        {/* Artist bio */}
        {artwork.artist.bio && (
          <div className="mt-5 bg-stone-50 rounded-2xl p-4">
            <p className="text-xs text-stone-400 uppercase tracking-widest font-medium mb-2">
              {artwork.artist.name}
            </p>
            <p className="text-sm text-stone-600 leading-relaxed">
              {infoLevel === "beginner"
                ? artwork.artist.bio.split(".")[0] + "."
                : artwork.artist.bio}
            </p>
          </div>
        )}

        {/* Unique work badges */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
            ◈ {t(lang, "unique_work")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
            ✓ {t(lang, "certificate")}
          </span>
        </div>
      </div>

      {/* Similar works */}
      {similar.length > 0 && (
        <div className="mt-8 px-4">
          <h2 className="text-base font-semibold text-stone-900 mb-3">
            {t(lang, "similar_works")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {similar.map((aw) => (
              <ArtworkCard key={aw.id} artwork={aw} />
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <InterestModal
          artworkId={artwork.id}
          artworkTitle={artwork.title}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
