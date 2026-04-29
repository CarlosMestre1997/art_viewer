# Migrating Images & Data to Supabase

This guide walks through transitioning the Art Viewer from local JSON + Unsplash placeholders to a Supabase backend with real artwork images stored in Supabase Storage.

---

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (GitHub OAuth works)
2. Click **New Project**
3. Choose your organization, set:
   - **Name**: `riga-contemporary` (or similar)
   - **Database Password**: generate and save securely
   - **Region**: choose closest to your users (e.g., `eu-central-1` for Latvia)
4. Wait ~2 minutes for provisioning
5. Once ready, go to **Settings → API** and note:
   - `Project URL` → e.g., `https://abcdefgh.supabase.co`
   - `anon public` key → e.g., `eyJhbGciOiJI...`

---

## 2. Create the Storage Bucket

1. In Supabase dashboard, go to **Storage** (left sidebar)
2. Click **New Bucket**
3. Configure:
   - **Name**: `artworks`
   - **Public**: toggle **ON** (images need to be publicly readable)
   - **File size limit**: 10MB (enough for images + 3D models)
   - **Allowed MIME types**: `image/jpeg, image/png, image/webp, model/gltf-binary`
4. Click **Create bucket**

> **Note**: The `.glb` extension uses MIME type `model/gltf-binary`. If Supabase doesn't recognize it, you can also try `application/octet-stream` as a fallback.

### Bucket Policies (already set by "Public" toggle, but verify)

Go to **Storage → Policies** and ensure the `artworks` bucket has:

```sql
-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'artworks');
```

If you want authenticated uploads only (recommended for production):

```sql
-- Allow authenticated uploads
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'artworks' AND auth.role() = 'authenticated');
```

---

## 3. Create Database Tables

Go to **SQL Editor** and run:

```sql
-- Artists table
CREATE TABLE artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  nationality TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Artworks table
CREATE TABLE artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist_id UUID REFERENCES artists(id) ON DELETE CASCADE,
  year INT,
  size TEXT,
  technique TEXT,
  price INT,
  description TEXT,
  category TEXT CHECK (category IN ('painting', 'sculpture', 'photography', 'mixed_media', 'drawing', 'ceramic')),
  image_path TEXT,              -- path in storage bucket, e.g., "aw1.jpg"
  model_type TEXT,              -- for 3D: knot, crystal, spikes, helix, totem, stack, orbit
  model_color TEXT,             -- hex color for 3D model
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites (anonymous, by session)
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, artwork_id)
);

-- Interest requests
CREATE TABLE interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics: Page views
CREATE TABLE artwork_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artwork_id UUID REFERENCES artworks(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster analytics queries
CREATE INDEX idx_artwork_views_artwork_id ON artwork_views(artwork_id);
CREATE INDEX idx_artwork_views_created_at ON artwork_views(created_at);
CREATE INDEX idx_favorites_artwork_id ON favorites(artwork_id);
CREATE INDEX idx_interests_artwork_id ON interests(artwork_id);

-- Admin users table (for admin page authentication)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'editor' CHECK (role IN ('admin', 'editor')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE artwork_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public read for artists and artworks
CREATE POLICY "Public read artists" ON artists FOR SELECT USING (true);
CREATE POLICY "Public read artworks" ON artworks FOR SELECT USING (true);

-- Anyone can insert favorites and interests (anonymous users)
CREATE POLICY "Insert favorites" ON favorites FOR INSERT WITH CHECK (true);
CREATE POLICY "Read own favorites" ON favorites FOR SELECT USING (true);
CREATE POLICY "Delete own favorites" ON favorites FOR DELETE USING (true);
CREATE POLICY "Insert interests" ON interests FOR INSERT WITH CHECK (true);

-- Anyone can log views (analytics)
CREATE POLICY "Insert views" ON artwork_views FOR INSERT WITH CHECK (true);

-- Admin-only policies (authenticated users in admin_users table)
CREATE POLICY "Admin read all" ON interests FOR SELECT
  USING (auth.email() IN (SELECT email FROM admin_users));
CREATE POLICY "Admin read views" ON artwork_views FOR SELECT
  USING (auth.email() IN (SELECT email FROM admin_users));
CREATE POLICY "Admin manage artists" ON artists FOR ALL
  USING (auth.email() IN (SELECT email FROM admin_users));
CREATE POLICY "Admin manage artworks" ON artworks FOR ALL
  USING (auth.email() IN (SELECT email FROM admin_users));
```

---

## 4. Upload Images to Storage

### Option A: Manual Upload (Dashboard)

1. Go to **Storage → artworks**
2. Click **Upload files**
3. Select your artwork images (recommend: 1200×1200px, JPEG/WebP, <500KB each)
4. Use consistent naming: `aw1.jpg`, `aw2.jpg`, etc.

### Option B: Bulk Upload Script

Create `scripts/upload-images.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // use service key for admin uploads
);

async function uploadImages(dir: string) {
  const files = fs.readdirSync(dir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    const { error } = await supabase.storage
      .from("artworks")
      .upload(file, fileBuffer, {
        contentType: `image/${path.extname(file).slice(1)}`,
        upsert: true,
      });
    
    if (error) console.error(`Failed: ${file}`, error.message);
    else console.log(`Uploaded: ${file}`);
  }
}

uploadImages("./images"); // folder containing your artwork images
```

Run with:
```bash
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=xxx npx tsx scripts/upload-images.ts
```

---

## 5. Seed the Database

Create `scripts/seed-db.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import data from "../data/artworks.json";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function seed() {
  // Insert artists
  const { data: artists, error: artistErr } = await supabase
    .from("artists")
    .upsert(
      data.artists.map((a: any) => ({
        id: a.id,
        name: a.name,
        nationality: a.nationality,
        bio: a.bio,
      })),
      { onConflict: "id" }
    )
    .select();

  if (artistErr) throw artistErr;
  console.log(`Seeded ${artists.length} artists`);

  // Insert artworks (map image_url to image_path)
  const { data: artworks, error: artworkErr } = await supabase
    .from("artworks")
    .upsert(
      data.artworks.map((aw: any) => ({
        id: aw.id,
        title: aw.title,
        artist_id: aw.artist_id,
        year: aw.year,
        size: aw.size,
        technique: aw.technique,
        price: aw.price,
        description: aw.description,
        category: aw.category,
        image_path: `${aw.id}.jpg`, // assumes you named uploads as aw1.jpg, etc.
        model_type: aw.model_type || null,
        model_color: aw.model_color || null,
      })),
      { onConflict: "id" }
    )
    .select();

  if (artworkErr) throw artworkErr;
  console.log(`Seeded ${artworks.length} artworks`);
}

seed();
```

---

## 6. Update Next.js Configuration

### Add Environment Variables

Create `.env.local` (git-ignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJI...
```

### Update `next.config.ts`

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }, // keep for fallback
      { protocol: "https", hostname: "*.supabase.co" },       // Supabase storage
    ],
  },
};

export default nextConfig;
```

---

## 7. Create Supabase Client

Install the SDK:

```bash
npm install @supabase/supabase-js
```

Create `lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Helper to get public URL for an image in the artworks bucket
export function getImageUrl(imagePath: string | null): string {
  if (!imagePath) return "/placeholder.jpg";
  
  const { data } = supabase.storage.from("artworks").getPublicUrl(imagePath);
  return data.publicUrl;
}
```

---

## 8. Update Data Fetching

Replace `lib/data.ts` with Supabase queries:

```typescript
import { supabase, getImageUrl } from "./supabase";
import { Artist, Artwork, ArtworkWithArtist } from "./types";

export async function getAllArtworks(): Promise<ArtworkWithArtist[]> {
  const { data, error } = await supabase
    .from("artworks")
    .select(`
      *,
      artist:artists(*)
    `)
    .order("year", { ascending: false });

  if (error) throw error;

  return data.map((row) => ({
    ...row,
    image_url: getImageUrl(row.image_path),
    artist: row.artist,
  }));
}

export async function getArtworkById(id: string): Promise<ArtworkWithArtist | null> {
  const { data, error } = await supabase
    .from("artworks")
    .select(`
      *,
      artist:artists(*)
    `)
    .eq("id", id)
    .single();

  if (error) return null;

  return {
    ...data,
    image_url: getImageUrl(data.image_path),
    artist: data.artist,
  };
}

export async function getSimilarArtworks(id: string, count = 4): Promise<ArtworkWithArtist[]> {
  const artwork = await getArtworkById(id);
  if (!artwork) return [];

  const { data, error } = await supabase
    .from("artworks")
    .select(`*, artist:artists(*)`)
    .or(`category.eq.${artwork.category},artist_id.eq.${artwork.artist_id}`)
    .neq("id", id)
    .limit(count);

  if (error) return [];

  return data.map((row) => ({
    ...row,
    image_url: getImageUrl(row.image_path),
    artist: row.artist,
  }));
}
```

---

## 9. Update Favorites to Use Supabase

Replace `lib/favorites.ts`:

```typescript
"use client";

import { supabase } from "./supabase";

// Get or create a session ID (anonymous user tracking)
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("rc_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("rc_session", id);
  }
  return id;
}

export async function getFavorites(): Promise<string[]> {
  const sessionId = getSessionId();
  if (!sessionId) return [];

  const { data } = await supabase
    .from("favorites")
    .select("artwork_id")
    .eq("session_id", sessionId);

  return data?.map((r) => r.artwork_id) ?? [];
}

export async function toggleFavorite(artworkId: string): Promise<string[]> {
  const sessionId = getSessionId();
  const current = await getFavorites();

  if (current.includes(artworkId)) {
    await supabase
      .from("favorites")
      .delete()
      .eq("session_id", sessionId)
      .eq("artwork_id", artworkId);
  } else {
    await supabase
      .from("favorites")
      .insert({ session_id: sessionId, artwork_id: artworkId });
  }

  return getFavorites();
}
```

---

## 10. Update Interest Submission

In `components/InterestModal.tsx`, replace localStorage with Supabase:

```typescript
import { supabase } from "@/lib/supabase";

async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  
  const { error } = await supabase.from("interests").insert({
    artwork_id: artworkId,
    name: name || null,
    email,
    message: message || null,
  });

  if (!error) setSent(true);
}
```

---

## 11. Track Artwork Views (Analytics)

Add view tracking to your artwork detail pages. Create `lib/analytics.ts`:

```typescript
import { supabase } from "./supabase";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("rc_session");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("rc_session", id);
  }
  return id;
}

export async function trackView(artworkId: string) {
  const sessionId = getSessionId();
  
  await supabase.from("artwork_views").insert({
    artwork_id: artworkId,
    session_id: sessionId,
  });
}
```

In your artwork detail page, call `trackView(artworkId)` in a `useEffect`:

```typescript
useEffect(() => {
  trackView(artwork.id);
}, [artwork.id]);
```

---

## 12. Set Up Admin Authentication

### 12.1 Enable Email Auth in Supabase

1. Go to **Authentication → Providers** in Supabase dashboard
2. Ensure **Email** is enabled
3. Go to **Authentication → URL Configuration**
4. Set **Site URL** to your production URL (e.g., `https://your-site.vercel.app`)
5. Add `http://localhost:3000` to **Redirect URLs** for local dev

### 12.2 Add Yourself as Admin

In **SQL Editor**, run:

```sql
-- First, create your admin user through Supabase Auth (sign up on the site)
-- Then add them to the admin_users table:
INSERT INTO admin_users (email, role) VALUES ('your-email@example.com', 'admin');
```

### 12.3 Create Admin Supabase Client

Create `lib/supabase-admin.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

// Server-side client with service role (only use in API routes/server actions)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // NOT the anon key!
);
```

Add to `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> **Important**: Never expose the service role key to the client!

---

## 13. Create the Admin Page

### 13.1 Admin Layout with Auth Protection

Create `app/admin/layout.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect("/admin/login");
  }

  // Check if user is in admin_users table
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select()
    .eq("email", session.user.email)
    .single();

  if (!adminUser) {
    redirect("/admin/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Riga Contemporary Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <form action="/api/auth/signout" method="POST">
              <button className="text-sm text-red-600 hover:underline">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
```

### 13.2 Admin Login Page

Create `app/admin/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClientComponentClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/admin");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded-lg shadow-md w-full max-w-md"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{error}</div>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
}
```

### 13.3 Admin Dashboard with Statistics

Create `app/admin/page.tsx`:

```typescript
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";

async function getStats(supabase: any) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Total counts
  const [artworks, artists, totalViews, totalFavorites, totalInterests] = await Promise.all([
    supabase.from("artworks").select("id", { count: "exact", head: true }),
    supabase.from("artists").select("id", { count: "exact", head: true }),
    supabase.from("artwork_views").select("id", { count: "exact", head: true }),
    supabase.from("favorites").select("id", { count: "exact", head: true }),
    supabase.from("interests").select("id", { count: "exact", head: true }),
  ]);

  // Last 7 days
  const [viewsWeek, favoritesWeek, interestsWeek] = await Promise.all([
    supabase
      .from("artwork_views")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
    supabase
      .from("interests")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString()),
  ]);

  // Top viewed artworks (all time)
  const { data: topViewed } = await supabase
    .from("artwork_views")
    .select("artwork_id, artworks(title, id)")
    .order("artwork_id");

  // Count views per artwork
  const viewCounts: Record<string, { count: number; title: string; id: string }> = {};
  topViewed?.forEach((v: any) => {
    if (v.artworks) {
      const id = v.artwork_id;
      if (!viewCounts[id]) {
        viewCounts[id] = { count: 0, title: v.artworks.title, id };
      }
      viewCounts[id].count++;
    }
  });
  const topArtworks = Object.values(viewCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent interest requests
  const { data: recentInterests } = await supabase
    .from("interests")
    .select("*, artworks(title)")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    totals: {
      artworks: artworks.count || 0,
      artists: artists.count || 0,
      views: totalViews.count || 0,
      favorites: totalFavorites.count || 0,
      interests: totalInterests.count || 0,
    },
    week: {
      views: viewsWeek.count || 0,
      favorites: favoritesWeek.count || 0,
      interests: interestsWeek.count || 0,
    },
    topArtworks,
    recentInterests: recentInterests || [],
  };
}

export default async function AdminDashboard() {
  const supabase = createServerComponentClient({ cookies });
  const stats = await getStats(supabase);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex gap-4">
          <Link
            href="/admin/artworks"
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Manage Artworks
          </Link>
          <Link
            href="/admin/artists"
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
          >
            Manage Artists
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Artworks" value={stats.totals.artworks} />
        <StatCard label="Total Artists" value={stats.totals.artists} />
        <StatCard label="Total Views" value={stats.totals.views} />
        <StatCard label="Total Favorites" value={stats.totals.favorites} />
        <StatCard label="Interest Requests" value={stats.totals.interests} />
      </div>

      {/* Weekly Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Last 7 Days</h3>
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Views" value={stats.week.views} small />
          <StatCard label="New Favorites" value={stats.week.favorites} small />
          <StatCard label="Interest Requests" value={stats.week.interests} small />
        </div>
      </div>

      {/* Top Artworks */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Most Viewed Artworks</h3>
        <div className="space-y-2">
          {stats.topArtworks.map((art, i) => (
            <div key={art.id} className="flex justify-between items-center py-2 border-b">
              <span>
                {i + 1}. {art.title}
              </span>
              <span className="text-gray-500">{art.count} views</span>
            </div>
          ))}
          {stats.topArtworks.length === 0 && (
            <p className="text-gray-500">No views recorded yet</p>
          )}
        </div>
      </div>

      {/* Recent Interest Requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Interest Requests</h3>
        <div className="space-y-4">
          {stats.recentInterests.map((interest: any) => (
            <div key={interest.id} className="border-b pb-4">
              <div className="flex justify-between">
                <span className="font-medium">{interest.artworks?.title}</span>
                <span className="text-sm text-gray-500">
                  {new Date(interest.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {interest.name || "Anonymous"} — {interest.email}
              </p>
              {interest.message && (
                <p className="text-sm text-gray-500 mt-1">{interest.message}</p>
              )}
            </div>
          ))}
          {stats.recentInterests.length === 0 && (
            <p className="text-gray-500">No interest requests yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, small }: { label: string; value: number; small?: boolean }) {
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${small ? "" : "text-center"}`}>
      <p className={`font-bold ${small ? "text-xl" : "text-3xl"}`}>{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}
```

### 13.4 Artwork Management Page

Create `app/admin/artworks/page.tsx`:

```typescript
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { getImageUrl } from "@/lib/supabase";
import DeleteButton from "./DeleteButton";

export default async function ManageArtworks() {
  const supabase = createServerComponentClient({ cookies });

  const { data: artworks } = await supabase
    .from("artworks")
    .select("*, artists(name)")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Manage Artworks</h2>
        <Link
          href="/admin/artworks/new"
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          + Add Artwork
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Image</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Artist</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {artworks?.map((artwork) => (
              <tr key={artwork.id} className="border-t">
                <td className="px-4 py-3">
                  <img
                    src={getImageUrl(artwork.image_path)}
                    alt={artwork.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                </td>
                <td className="px-4 py-3 font-medium">{artwork.title}</td>
                <td className="px-4 py-3">{artwork.artists?.name}</td>
                <td className="px-4 py-3 capitalize">{artwork.category}</td>
                <td className="px-4 py-3">€{artwork.price?.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/artworks/${artwork.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton id={artwork.id} type="artwork" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 13.5 Add/Edit Artwork Form

Create `app/admin/artworks/new/page.tsx` (same form for edit at `[id]/page.tsx`):

```typescript
"use client";

import { useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";

const CATEGORIES = ["painting", "sculpture", "photography", "mixed_media", "drawing", "ceramic"];
const MODEL_TYPES = ["knot", "crystal", "spikes", "helix", "totem", "stack", "orbit"];

export default function NewArtwork() {
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const artworkId = crypto.randomUUID();
    let imagePath = null;
    let modelPath = null;

    // Upload image if provided
    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      imagePath = `${artworkId}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(imagePath, imageFile);

      if (uploadError) {
        alert("Failed to upload image: " + uploadError.message);
        setLoading(false);
        return;
      }
    }

    // Upload 3D model if provided
    if (modelFile) {
      modelPath = `models/${artworkId}.glb`;
      
      const { error: uploadError } = await supabase.storage
        .from("artworks")
        .upload(modelPath, modelFile);

      if (uploadError) {
        alert("Failed to upload 3D model: " + uploadError.message);
        setLoading(false);
        return;
      }
    }

    // Insert artwork record
    const { error } = await supabase.from("artworks").insert({
      id: artworkId,
      title: form.get("title"),
      artist_id: form.get("artist_id") || null,
      year: form.get("year") ? parseInt(form.get("year") as string) : null,
      size: form.get("size") || null,
      technique: form.get("technique") || null,
      price: form.get("price") ? parseInt(form.get("price") as string) : null,
      description: form.get("description") || null,
      category: form.get("category") || null,
      image_path: imagePath,
      model_type: form.get("model_type") || null,
      model_color: form.get("model_color") || null,
    });

    if (error) {
      alert("Failed to create artwork: " + error.message);
      setLoading(false);
      return;
    }

    router.push("/admin/artworks");
    router.refresh();
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Add New Artwork</h2>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            name="title"
            required
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Artist</label>
          <ArtistSelect />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <input name="year" type="number" className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price (€)</label>
            <input name="price" type="number" className="w-full p-2 border rounded" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select name="category" className="w-full p-2 border rounded">
            <option value="">Select category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Size</label>
            <input
              name="size"
              placeholder="e.g., 100×80 cm"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Technique</label>
            <input
              name="technique"
              placeholder="e.g., Oil on canvas"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            rows={4}
            className="w-full p-2 border rounded"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Image</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <h3 className="font-medium mb-2">3D Model (Optional)</h3>
          
          <div>
            <label className="block text-sm font-medium mb-1">Upload GLB File</label>
            <input
              type="file"
              accept=".glb"
              onChange={(e) => setModelFile(e.target.files?.[0] || null)}
              className="w-full p-2 border rounded"
            />
          </div>

          <p className="text-sm text-gray-500 my-2">— or use procedural model —</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Model Type</label>
              <select name="model_type" className="w-full p-2 border rounded">
                <option value="">None</option>
                {MODEL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Model Color</label>
              <input
                name="model_color"
                type="color"
                defaultValue="#6366f1"
                className="w-full h-10 border rounded"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-3 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Artwork"}
        </button>
      </form>
    </div>
  );
}

function ArtistSelect() {
  // You'd fetch artists here - simplified for guide
  return (
    <select name="artist_id" className="w-full p-2 border rounded">
      <option value="">Select artist</option>
      {/* Artists loaded dynamically */}
    </select>
  );
}
```

### 13.6 Note on Packages

The admin page uses `@supabase/supabase-js` directly (already installed in step 7). The auth-helpers package is deprecated; for server components requiring auth, use `@supabase/ssr` instead.

---

## 14. Add Environment Variables to Vercel

1. Go to your Vercel project dashboard
2. **Settings → Environment Variables**
3. Add:
   - `NEXT_PUBLIC_SUPABASE_URL` → your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your anon key
   - `SUPABASE_SERVICE_ROLE_KEY` → for admin functions (keep secret!)
4. Redeploy (or it auto-deploys on next push)

---

## 15. Image Optimization Tips

Supabase Storage supports **on-the-fly transforms** (requires Pro plan or self-hosted):

```
https://xxx.supabase.co/storage/v1/object/public/artworks/aw1.jpg?width=600&quality=80
```

For the free tier, pre-optimize images before upload:
- Target: 1200×1200px max dimension
- Format: WebP (best) or JPEG (wider support)
- Quality: 80%
- File size: <300KB per image

Tools: [Squoosh](https://squoosh.app), ImageMagick, Sharp

---

## Checklist

### Phase 1: Basic Setup
- [ ] Supabase project created
- [ ] Storage bucket `artworks` created (public, MIME types: jpeg, png, webp, gltf-binary)
- [ ] Database tables created (artists, artworks, favorites, interests, artwork_views, admin_users)
- [ ] RLS policies applied
- [ ] Images uploaded to storage
- [ ] Database seeded with artists/artworks
- [ ] `@supabase/supabase-js` installed
- [ ] `lib/supabase.ts` created
- [ ] `lib/data.ts` updated to fetch from Supabase
- [ ] `lib/favorites.ts` updated for Supabase
- [ ] `InterestModal` updated for Supabase
- [ ] `next.config.ts` allows `*.supabase.co` images
- [ ] Environment variables set locally (`.env.local`)
- [ ] Environment variables set in Vercel

### Phase 2: Analytics
- [ ] `lib/analytics.ts` created
- [ ] View tracking added to artwork detail page

### Phase 3: Admin Page
- [ ] Admin page created at `app/admin/page.tsx`
- [ ] Admin user added to `admin_users` table
- [ ] `app/admin/layout.tsx` created (auth protection)
- [ ] `app/admin/login/page.tsx` created
- [ ] `app/admin/page.tsx` created (dashboard with stats)
- [ ] `app/admin/artworks/page.tsx` created (artwork list)
- [ ] `app/admin/artworks/new/page.tsx` created (add artwork form)
- [ ] `app/admin/artists/page.tsx` created (artist management)
- [ ] Test admin login and upload flow

### Final
- [ ] Test locally with `npm run dev`
- [ ] Push and verify production deployment

---

## Estimated Time

| Task | Time |
|------|------|
| Supabase setup | 10 min |
| Database schema + analytics tables | 15 min |
| Image upload | 15–30 min (depending on count) |
| Core code changes (data, favorites, interests) | 30 min |
| Analytics integration | 15 min |
| Admin page setup | 45–60 min |
| Testing | 20 min |
| **Total** | ~2.5–3 hours |

---

## Your Next Steps

Since you're at the bucket creation step:

1. **Finish bucket setup** — include MIME type `model/gltf-binary` for .glb files
2. **Run the SQL** — create all tables including `artwork_views` and `admin_users`
3. **Get your env vars** — copy Project URL, anon key, and service role key
4. **Install packages**: `npm install @supabase/supabase-js @supabase/auth-helpers-nextjs`
5. **Create the admin user in Supabase Auth** — sign up via Auth → Users → "Add user"
6. **Add yourself to admin_users** — run the INSERT SQL with your email

Then I can help you build out the actual admin page files.

---

## Notes

- **3D models**: The schema supports both procedural models (via `model_type`/`model_color`) and uploaded .glb files (stored in the bucket under `models/`).
- **Statistics tracking**: Views, favorites, and interest requests are all tracked with timestamps for time-based analytics.
- **Admin security**: The admin page uses Supabase Auth + an `admin_users` allowlist. Only users in that table can access `/admin`.
