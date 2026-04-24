export interface Artist {
  id: string;
  name: string;
  bio?: string;
  nationality?: string;
}

export type Model3DType = "knot" | "crystal" | "spikes" | "helix" | "totem" | "stack" | "orbit";

export interface Artwork {
  id: string;
  title: string;
  artist_id: string;
  year: number;
  size: string;
  technique: string;
  price: number;
  description: string;
  image_url: string;
  category: "painting" | "sculpture" | "photography" | "mixed_media" | "drawing" | "ceramic";
  is_sculpture?: boolean;
  model_type?: Model3DType;
  model_color?: string;
}

export interface ArtworkWithArtist extends Artwork {
  artist: Artist;
}

export type Language = "en" | "lv";

export type SortOption = "price_asc" | "price_desc" | "year_desc" | "artist_az";
export type FilterCategory = "all" | "painting" | "sculpture" | "photography" | "mixed_media" | "drawing" | "ceramic";
export type PriceRange = "any" | "u500" | "500_1500" | "1500_3000" | "o3000";
