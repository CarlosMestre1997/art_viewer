export interface Artist {
  id: string;
  name: string;
  bio?: string;
  nationality?: string;
}

export type Model3DType = "knot" | "crystal" | "spikes" | "helix" | "totem" | "stack" | "orbit";

export interface ArtworkImage {
  id: string;
  path: string;
  sort_order: number;
}

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
  image_path?: string;
  category: "painting" | "sculpture" | "photography" | "mixed_media" | "drawing" | "ceramic";
  is_sculpture?: boolean;
  model_type?: Model3DType;
  model_color?: string;
  model_path?: string;   // path to uploaded GLB in Supabase Storage
  model_scale?: number;  // scale multiplier for GLB (default 1.0 = auto-fit)
  image_fit?: "cover" | "contain"; // how images fill the frame (default "cover")
}

export interface ArtworkWithArtist extends Artwork {
  artist: Artist;
  images: ArtworkImage[]; // gallery images from artwork_images table
}

export type Language = "en" | "lv";

export type SortOption = "price_asc" | "price_desc" | "year_desc" | "artist_az";
export type FilterCategory = "all" | "painting" | "sculpture" | "photography" | "mixed_media" | "drawing" | "ceramic";
export type PriceRange = "any" | "u500" | "500_1500" | "1500_3000" | "o3000";
