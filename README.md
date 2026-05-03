# Riga Contemporary Art Viewer

A mobile-first web application for browsing and exploring artworks at the Riga Contemporary 2026 art fair. Features bilingual support (English/Latvian), 3D sculpture visualization, and a favorites system.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database & Storage**: Supabase (PostgreSQL + file storage)
- **3D Rendering**: Three.js via @react-three/fiber
- **Icons**: Lucide React
- **React**: v19 with React Compiler (babel-plugin-react-compiler)

## Project Structure

```
app/
├── page.tsx              # Home - artwork grid with filters
├── artwork/[id]/page.tsx # Artwork detail with gallery & 3D viewer
├── favorites/page.tsx    # User's saved artworks
├── admin/page.tsx        # Admin panel
└── layout.tsx            # Root layout with providers

components/
├── ArtworkCard.tsx       # Grid card with 3D/image display
├── FilterBar.tsx         # Search, category, price & sort filters
├── Sculpture3D.tsx       # Procedural 3D sculpture generator
├── GLBViewer.tsx         # Uploaded GLB model viewer
├── InterestModal.tsx     # Contact form for artwork inquiries
├── Navbar.tsx            # Bottom navigation
├── Onboarding.tsx        # First-visit welcome flow
└── OnboardingGate.tsx    # Onboarding state wrapper

lib/
├── AppContext.tsx        # Global state (language, favorites, info level)
├── data.ts               # Supabase data fetching
├── supabase.ts           # Supabase client
├── supabase-admin.ts     # Admin client for server operations
├── types.ts              # TypeScript interfaces
├── i18n.ts               # Translations (EN/LV)
├── analytics.ts          # View tracking
└── favorites.ts          # LocalStorage favorites persistence
```

## Key Features

- **Artwork Categories**: Painting, sculpture, ceramic, photography, mixed media, drawing
- **3D Models**: Sculptures display as auto-rotating 3D models (procedural or uploaded GLB)
- **Image Gallery**: Swipeable photo galleries on detail pages
- **Bilingual**: Full EN/LV language support
- **Info Levels**: Beginner/Advanced description modes
- **Favorites**: Locally persisted saved artworks
- **PWA Ready**: Manifest configured for home screen installation

## Getting Started

```bash
npm install
npm run dev
```


## Database Setup

### 1. Create Supabase Project

Create a new project at [supabase.com](https://supabase.com) and note your project URL and anon key.

### 2. Run Migrations

Execute the SQL migrations in order via the Supabase SQL Editor:

```
migrations/001_schema.sql        # Core tables (artists, artworks, favorites, interests, artwork_views, admin_users)
migrations/002_rls_policies.sql  # Row-level security policies
migrations/003_seed_admin.sql    # Initial admin user
migrations/004_admin_auth_policy.sql
migrations/005_storage_and_multi_image.sql  # Storage policies + artwork_images table
migrations/006_model_scale.sql   # GLB model scale column
migrations/007_image_fit.sql     # Image fit mode column
```

### 3. Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Create a new bucket named `artworks`
3. Set bucket to **Public**
4. Click **Edit bucket** and configure **Allowed MIME types**:

```
image/jpeg, image/png, image/webp, model/gltf-binary, application/octet-stream
```

The `application/octet-stream` type is required because Supabase server-side MIME detection classifies `.glb` files as `application/octet-stream` regardless of the Content-Type header sent by the client.

### 4. Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Database Schema

- `artists` - Artist profiles (name, bio, nationality)
- `artworks` - Artwork records with pricing, dimensions, 3D model config
- `artwork_images` - Gallery images per artwork
- `interests` - Contact form submissions
- `artwork_views` - View tracking analytics
- `favorites` - Session-based saved artworks
- `admin_users` - Admin access allowlist
