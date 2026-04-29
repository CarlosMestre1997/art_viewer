"use client";

import { use, useState, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Heart, ChevronLeft, Info } from "lucide-react";
import { getArtworkById, getSimilarArtworks } from "@/lib/data";
import { getImageUrl } from "@/lib/supabase";
import { useApp } from "@/lib/AppContext";
import { t } from "@/lib/i18n";
import { trackView } from "@/lib/analytics";
import InterestModal from "@/components/InterestModal";
import ArtworkCard from "@/components/ArtworkCard";
import { ArtworkWithArtist } from "@/lib/types";

const DETAIL_BG = "#faf7f1";

const Sculpture3D = dynamic(() => import("@/components/Sculpture3D"), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: DETAIL_BG }} />,
});

const GLBViewer = dynamic(() => import("@/components/GLBViewer"), {
  ssr: false,
  loading: () => <div className="w-full h-full" style={{ background: DETAIL_BG }} />,
});

interface Props {
  params: Promise<{ id: string }>;
}

export default function ArtworkDetailPage({ params }: Props) {
  const { id } = use(params);
  const [artwork, setArtwork] = useState<ArtworkWithArtist | null | undefined>(undefined);
  const [similar, setSimilar] = useState<ArtworkWithArtist[]>([]);
  const { lang, favorites, toggleFavorite, infoLevel, setInfoLevel } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);
  const galleryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getArtworkById(id).then((data) => {
      setArtwork(data);
      if (data) {
        trackView(id);
        getSimilarArtworks(id).then(setSimilar);
      }
    });
  }, [id]);

  if (artwork === undefined) {
    return <div className="flex items-center justify-center h-64 text-stone-400 text-sm">Loading...</div>;
  }
  if (artwork === null) notFound();

  const isFav = favorites.includes(artwork.id);
  const hasProceduralModel = !!artwork.model_type;
  const hasUploadedModel = !!artwork.model_path;
  const has3D = hasProceduralModel || hasUploadedModel;

  // Build gallery image list from artwork_images table; fall back to image_path
  const galleryImages = artwork.images.length > 0
    ? artwork.images.map((img) => getImageUrl(img.path))
    : (artwork.image_path ? [getImageUrl(artwork.image_path)] : []);

  const hasGallery = galleryImages.length > 0;
  const hasMultipleSlides = has3D
    ? galleryImages.length > 0  // model + photos
    : galleryImages.length > 1;  // multiple photos

  function scrollToSlide(index: number) {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: el.clientWidth * index, behavior: "smooth" });
    setActiveSlide(index);
  }

  function handleScroll() {
    const el = galleryRef.current;
    if (!el) return;
    const slide = Math.round(el.scrollLeft / el.clientWidth);
    setActiveSlide(slide);
  }

  // Total slides: 3D model (if any) + gallery photos
  const slideCount = has3D ? 1 + galleryImages.length : galleryImages.length;

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

      {/* Gallery — swipeable */}
      <div className="relative">
        <div
          ref={galleryRef}
          onScroll={handleScroll}
          className="gallery-scroll flex overflow-x-auto snap-x snap-mandatory"
        >
          {/* Slide 0: 3D model or first photo */}
          {has3D ? (
            <div
              className="shrink-0 w-full aspect-square overflow-hidden snap-start relative"
              style={{ background: DETAIL_BG }}
            >
              {hasUploadedModel ? (
                <GLBViewer
                  url={getImageUrl(artwork.model_path!)}
                  spinning
                  scale={artwork.model_scale ?? 1}
                />
              ) : (
                <Sculpture3D
                  type={artwork.model_type!}
                  color={artwork.model_color ?? "#b8a27a"}
                  spinning
                />
              )}
              <span className="absolute top-3 left-3 bg-stone-900 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full tracking-widest uppercase">
                3D
              </span>
              {hasMultipleSlides && (
                <span className="absolute bottom-3 left-3 bg-black/40 text-white text-[10px] px-2 py-1 rounded-full">
                  swipe for photos →
                </span>
              )}
            </div>
          ) : null}

          {/* Photo slides */}
          {galleryImages.map((src, i) => (
            <div
              key={i}
              className={`shrink-0 w-full aspect-square overflow-hidden snap-start relative ${
                !has3D && artwork.category === "drawing" ? "pencil-filter" : ""
              }`}
              style={{ background: DETAIL_BG }}
            >
              <Image
                src={src}
                alt={`${artwork.title} — photo ${i + 1}`}
                fill
                sizes="100vw"
                className={artwork.image_fit === "contain" ? "object-contain" : "object-cover"}
                priority={i === 0}
              />
            </div>
          ))}

          {/* Fallback if no images at all */}
          {!has3D && !hasGallery && (
            <div
              className="shrink-0 w-full aspect-square snap-start flex items-center justify-center"
              style={{ background: DETAIL_BG }}
            >
              <p className="text-stone-400 text-sm">No image</p>
            </div>
          )}
        </div>

        {/* Dot indicators */}
        {slideCount > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {Array.from({ length: slideCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToSlide(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  activeSlide === i ? "bg-white w-4" : "bg-white/50"
                }`}
              />
            ))}
          </div>
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
        <h1 className="text-2xl font-bold text-stone-900 mt-0.5 leading-snug">{artwork.title}</h1>
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
          <p className="mt-3 text-stone-600 text-sm leading-relaxed">{artwork.description}</p>
        )}

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

        <div className="flex gap-2 mt-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
            ◈ {t(lang, "unique_work")}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
            ✓ {t(lang, "certificate")}
          </span>
        </div>
      </div>

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
