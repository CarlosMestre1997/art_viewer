import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to get public URL for an image.
// If path is already an external URL, return it directly.
// Otherwise resolve it from Supabase Storage.
export function getImageUrl(imagePath: string | null): string {
  if (!imagePath) return "/placeholder.jpg";
  if (imagePath.startsWith("http")) return imagePath;

  const { data } = supabase.storage.from("artworks").getPublicUrl(imagePath);
  return data.publicUrl;
}