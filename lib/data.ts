import { supabase, getImageUrl } from "./supabase";
import { ArtworkWithArtist } from "./types";

export async function getAllArtworks(): Promise<ArtworkWithArtist[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select("*, artist:artists(*)")
    .order("year", { ascending: false });

  if (error) {
    console.error("getAllArtworks error:", error.message);
    return [];
  }

  return data.map((row) => ({
    ...row,
    image_url: getImageUrl(row.image_path),
    images: [],
  }));
}

export async function getArtworkById(id: string): Promise<ArtworkWithArtist | null> {
  const { data, error } = await supabase
    .from("artworks")
    .select("*, artist:artists(*), images:artwork_images(id, path, sort_order)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getArtworkById error:", error.message);
    return null;
  }

  const images = (data.images ?? []).sort(
    (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
  );

  return {
    ...data,
    image_url: getImageUrl(data.image_path),
    images,
  };
}

export async function getSimilarArtworks(id: string, count = 4): Promise<ArtworkWithArtist[]> {
  const artwork = await getArtworkById(id);
  if (!artwork) return [];

  const { data, error } = await supabase
    .from("artworks")
    .select("*, artist:artists(*)")
    .or(`category.eq.${artwork.category},artist_id.eq.${artwork.artist_id}`)
    .neq("id", id)
    .limit(count);

  if (error) return [];

  return data.map((row) => ({
    ...row,
    image_url: getImageUrl(row.image_path),
    images: [],
  }));
}
