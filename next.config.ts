
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
