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

Requires environment variables for Supabase connection (see `.env.local.example`).

## Database Schema

- `artists` - Artist profiles (name, bio, nationality)
- `artworks` - Artwork records with pricing, dimensions, 3D model config
- `artwork_images` - Gallery images per artwork
- `inquiries` - Contact form submissions
- `analytics` - View tracking
