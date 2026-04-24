import rawData from "@/data/artworks.json";
import { Artist, Artwork, ArtworkWithArtist } from "./types";

const artists: Artist[] = rawData.artists;
const artworks: Artwork[] = rawData.artworks as Artwork[];

export function getAllArtworks(): ArtworkWithArtist[] {
  return artworks.map((aw) => ({
    ...aw,
    artist: artists.find((a) => a.id === aw.artist_id)!,
  }));
}

export function getArtworkById(id: string): ArtworkWithArtist | null {
  const aw = artworks.find((a) => a.id === id);
  if (!aw) return null;
  return { ...aw, artist: artists.find((a) => a.id === aw.artist_id)! };
}

export function getSimilarArtworks(id: string, count = 4): ArtworkWithArtist[] {
  const target = artworks.find((a) => a.id === id);
  if (!target) return [];
  return getAllArtworks()
    .filter(
      (a) =>
        a.id !== id &&
        (a.category === target.category || a.artist_id === target.artist_id)
    )
    .slice(0, count);
}

export { artists, artworks };
