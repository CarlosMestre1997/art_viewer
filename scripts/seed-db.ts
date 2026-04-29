import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import data from "../data/artworks.json";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Convert a short ID like "a1" or "aw1" into a stable, valid UUID.
// Same input always produces the same UUID — safe to re-run.
function toUUID(shortId: string): string {
  const h = createHash("md5").update(shortId).digest("hex");
  return [h.slice(0,8), h.slice(8,12), "4" + h.slice(13,16),
    (((parseInt(h[16], 16) & 0x3) | 0x8)).toString(16) + h.slice(17,20),
    h.slice(20, 32)].join("-");
}

async function seed() {
  console.log("Seeding artists...");
  const { data: artists, error: artistErr } = await supabase
    .from("artists")
    .upsert(
      data.artists.map((a) => ({
        id: toUUID(a.id),
        name: a.name,
        nationality: a.nationality,
        bio: a.bio,
      })),
      { onConflict: "id" }
    )
    .select();

  if (artistErr) { console.error("Artist seed error:", artistErr.message); process.exit(1); }
  console.log(`✓ Seeded ${artists.length} artists`);

  console.log("Seeding artworks...");
  const { data: artworks, error: artworkErr } = await supabase
    .from("artworks")
    .upsert(
      data.artworks.map((aw) => ({
        id: toUUID(aw.id),
        title: aw.title,
        artist_id: toUUID(aw.artist_id),
        year: aw.year,
        size: aw.size,
        technique: aw.technique,
        price: aw.price,
        description: aw.description,
        category: aw.category,
        image_path: aw.image_url,
        model_type: aw.model_type ?? null,
        model_color: aw.model_color ?? null,
      })),
      { onConflict: "id" }
    )
    .select();

  if (artworkErr) { console.error("Artwork seed error:", artworkErr.message); process.exit(1); }
  console.log(`✓ Seeded ${artworks.length} artworks`);
  console.log("Done!");
}

seed();
