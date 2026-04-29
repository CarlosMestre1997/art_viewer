import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/AppContext";
import ConditionalNavbar from "@/components/ConditionalNavbar";
import OnboardingGate from "@/components/OnboardingGate";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Riga Contemporary | Art Fair 2026",
  description: "Discover and collect contemporary art from Latvian and international artists.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1c1917",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 text-stone-900 font-(family-name:--font-geist-sans)">
        <AppProvider>
          <OnboardingGate />
          <ConditionalNavbar />
          <main className="max-w-2xl mx-auto pb-16">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
