"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Lock, Plus, Trash2, Edit2, X, Image as ImageIcon, Box,
  BarChart3, Eye, Heart, Mail, RefreshCw, Globe, Upload,
} from "lucide-react";
import dynamic from "next/dynamic";
import { createClient } from "@supabase/supabase-js";
import { useApp } from "@/lib/AppContext";

const GLBPreview = dynamic(() => import("@/components/GLBViewer"), { ssr: false });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function resolveUrl(path: string | undefined): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  const { data } = supabase.storage.from("artworks").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Artist { id: string; name: string; nationality?: string; bio?: string }

interface StoredImage { id: string; path: string; sort_order: number }

interface Artwork {
  id: string; title: string; artist_id: string; year: number;
  size: string; technique: string; price: number; description: string;
  category: string; image_path?: string; model_type?: string;
  model_color?: string; model_path?: string; model_scale?: number;
  image_fit?: "cover" | "contain";
  artists?: { name: string };
  images?: StoredImage[];
}

interface Stats {
  totalViews: number; totalFavorites: number; totalInterests: number;
  weekViews: number; weekFavorites: number; weekInterests: number;
  topArtworks: { id: string; title: string; views: number }[];
  recentInterests: { id: string; artwork_title: string; email: string; name?: string; message?: string; created_at: string }[];
}

const CATEGORIES = ["painting", "sculpture", "ceramic", "photography", "mixed_media", "drawing"];
const MODEL_TYPES = ["knot", "crystal", "spikes", "helix", "totem", "stack", "orbit"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { lang, setLang } = useApp();

  // Auth
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // Data
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "artworks" | "artists">("dashboard");

  // Artwork form
  const [showArtworkForm, setShowArtworkForm] = useState(false);
  const [editingArtwork, setEditingArtwork] = useState<Artwork | null>(null);
  const [uploading, setUploading] = useState(false);
  // Images
  const [existingImages, setExistingImages] = useState<StoredImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  // 3D model
  const [modelMode, setModelMode] = useState<"none" | "procedural" | "glb">("none");
  const [glbFile, setGlbFile] = useState<File | null>(null);
  const [glbPreviewUrl, setGlbPreviewUrl] = useState<string | null>(null);
  const [modelScale, setModelScale] = useState(1.0);
  const [imageFit, setImageFit] = useState<"cover" | "contain">("cover");

  // Artist form
  const [showArtistForm, setShowArtistForm] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);

  const hasLoadedData = useRef(false);

  // ── Data loading (declared first so checkAdminStatus can depend on loadData) ──

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    const ago7 = new Date(Date.now() - 7 * 86400_000).toISOString();

    const [tv, tf, ti, wv, wf, wi] = await Promise.all([
      supabase.from("artwork_views").select("id", { count: "exact", head: true }),
      supabase.from("favorites").select("id", { count: "exact", head: true }),
      supabase.from("interests").select("id", { count: "exact", head: true }),
      supabase.from("artwork_views").select("id", { count: "exact", head: true }).gte("created_at", ago7),
      supabase.from("favorites").select("id", { count: "exact", head: true }).gte("created_at", ago7),
      supabase.from("interests").select("id", { count: "exact", head: true }).gte("created_at", ago7),
    ]);

    const { data: viewRows } = await supabase
      .from("artwork_views").select("artwork_id, artworks(id, title)");

    type VRow = { artwork_id: string; artworks: { id: string; title: string } | null };
    const counts: Record<string, { id: string; title: string; views: number }> = {};
    (viewRows as VRow[] | null)?.forEach((v) => {
      if (!v.artworks) return;
      if (!counts[v.artwork_id]) counts[v.artwork_id] = { id: v.artwork_id, title: v.artworks.title, views: 0 };
      counts[v.artwork_id].views++;
    });
    const topArtworks = Object.values(counts).sort((a, b) => b.views - a.views).slice(0, 5);

    const { data: iRows } = await supabase
      .from("interests").select("*, artworks(title)")
      .order("created_at", { ascending: false }).limit(10);

    type IRow = { id: string; email: string; name?: string; message?: string; created_at: string; artworks: { title: string } | null };
    const recentInterests = (iRows as IRow[] | null)?.map((i) => ({
      id: i.id, artwork_title: i.artworks?.title || "Unknown",
      email: i.email, name: i.name, message: i.message, created_at: i.created_at,
    })) || [];

    setStats({
      totalViews: tv.count || 0, totalFavorites: tf.count || 0, totalInterests: ti.count || 0,
      weekViews: wv.count || 0, weekFavorites: wf.count || 0, weekInterests: wi.count || 0,
      topArtworks, recentInterests,
    });
    setLoadingStats(false);
  }, []);

  const loadData = useCallback(async () => {
    const [{ data: a }, { data: aw }] = await Promise.all([
      supabase.from("artists").select("*").order("name"),
      supabase.from("artworks").select("*, artists(name), images:artwork_images(id, path, sort_order)")
        .order("created_at", { ascending: false }),
    ]);
    if (a) setArtists(a);
    if (aw) setArtworks(aw);
    loadStats();
  }, [loadStats]);

  // ── Auth (after loadData so checkAdminStatus can depend on it) ────────────

  const checkAdminStatus = useCallback(async (userEmail: string) => {
    const { data } = await supabase
      .from("admin_users").select("email").eq("email", userEmail).single();
    if (data) {
      setAuthenticated(true);
      if (!hasLoadedData.current) { hasLoadedData.current = true; loadData(); }
    } else {
      setAuthError("Your account is not authorised as admin.");
      await supabase.auth.signOut();
    }
    setCheckingAuth(false);
  }, [loadData]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) checkAdminStatus(session.user.email ?? "");
      else setCheckingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) checkAdminStatus(session.user.email ?? "");
      else { setAuthenticated(false); setCheckingAuth(false); hasLoadedData.current = false; }
    });
    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  async function handleLogin(e: { preventDefault(): void }) {
    e.preventDefault();
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthError(error.message);
  }

  async function handleLogout() { await supabase.auth.signOut(); }

  // ── Artwork CRUD ──────────────────────────────────────────────────────────

  function openArtworkForm(aw: Artwork | null) {
    setEditingArtwork(aw);
    setExistingImages(aw?.images ?? []);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setGlbFile(null);
    setGlbPreviewUrl(null);
    setModelScale(aw?.model_scale ?? 1.0);
    setImageFit(aw?.image_fit ?? "cover");
    if (aw?.model_path) setModelMode("glb");
    else if (aw?.model_type) setModelMode("procedural");
    else setModelMode("none");
    setShowArtworkForm(true);
  }

  function closeArtworkForm() {
    setShowArtworkForm(false);
    setEditingArtwork(null);
    setExistingImages([]);
    setNewImageFiles([]);
    setNewImagePreviews([]);
    if (glbPreviewUrl) URL.revokeObjectURL(glbPreviewUrl);
    setGlbFile(null);
    setGlbPreviewUrl(null);
    setModelMode("none");
    setModelScale(1.0);
    setImageFit("cover");
  }

  function handleGlbSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (glbPreviewUrl) URL.revokeObjectURL(glbPreviewUrl);
    setGlbFile(file);
    setGlbPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setNewImageFiles((prev) => [...prev, ...files]);
    files.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setNewImagePreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  }

  function removeNewImage(index: number) {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function removeExistingImage(id: string) {
    setExistingImages((prev) => prev.filter((img) => img.id !== id));
  }

  async function uploadFile(file: File, folder = ""): Promise<string | null> {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const path = `${folder}${crypto.randomUUID()}.${ext}`;
    // Supabase server-side MIME detection classifies .glb as application/octet-stream
    // regardless of what content-type the client sends, so we match that here.
    // The bucket must allow application/octet-stream (see migration 005 note).
    const contentType = ext === "glb" ? "application/octet-stream" : (file.type || "application/octet-stream");
    const { error } = await supabase.storage.from("artworks").upload(path, file, { contentType });
    if (error) { console.error("Upload error:", error.message); return null; }
    return path;
  }

  async function saveArtwork(formData: FormData) {
    setUploading(true);
    try {
      const artworkId = editingArtwork?.id ?? crypto.randomUUID();

      // Upload new images
      const uploadedPaths: string[] = [];
      for (const file of newImageFiles) {
        const path = await uploadFile(file, "images/");
        if (path) uploadedPaths.push(path);
      }

      // All image paths: surviving existing + newly uploaded
      const allImagePaths = [
        ...existingImages.map((img) => img.path),
        ...uploadedPaths,
      ];

      // Primary image (used for card thumbnails)
      const primaryImagePath = allImagePaths[0] ?? editingArtwork?.image_path ?? null;

      // Upload GLB if provided
      let modelPath: string | null = editingArtwork?.model_path ?? null;
      if (modelMode === "glb" && glbFile) {
        modelPath = await uploadFile(glbFile, "models/");
      } else if (modelMode !== "glb") {
        modelPath = null;
      }

      const row = {
        id: artworkId,
        title: formData.get("title") as string,
        artist_id: (formData.get("artist_id") as string) || null,
        year: parseInt(formData.get("year") as string) || null,
        size: (formData.get("size") as string) || null,
        technique: (formData.get("technique") as string) || null,
        price: parseInt(formData.get("price") as string) || null,
        description: (formData.get("description") as string) || null,
        category: (formData.get("category") as string) || null,
        image_path: primaryImagePath,
        model_type: modelMode === "procedural" ? ((formData.get("model_type") as string) || null) : null,
        model_color: modelMode === "procedural" ? ((formData.get("model_color") as string) || null) : null,
        model_path: modelPath,
        model_scale: modelMode === "glb" ? modelScale : null,
        image_fit: imageFit,
      };

      const { error: upsertErr } = await supabase.from("artworks").upsert(row, { onConflict: "id" });
      if (upsertErr) throw upsertErr;

      // Replace artwork_images entries
      await supabase.from("artwork_images").delete().eq("artwork_id", artworkId);
      if (allImagePaths.length > 0) {
        await supabase.from("artwork_images").insert(
          allImagePaths.map((path, i) => ({ artwork_id: artworkId, path, sort_order: i }))
        );
      }

      await loadData();
      closeArtworkForm();
    } catch (err) {
      alert("Error saving: " + (err instanceof Error ? err.message : "Unknown error"));
    }
    setUploading(false);
  }

  async function deleteArtwork(id: string) {
    if (!confirm("Delete this artwork?")) return;
    const aw = artworks.find((a) => a.id === id);
    if (aw?.image_path && !aw.image_path.startsWith("http")) {
      await supabase.storage.from("artworks").remove([aw.image_path]);
    }
    await supabase.from("artworks").delete().eq("id", id);
    await loadData();
  }

  // ── Artist CRUD ───────────────────────────────────────────────────────────

  async function saveArtist(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const row = {
      id: editingArtist?.id,
      name: fd.get("name") as string,
      nationality: (fd.get("nationality") as string) || null,
      bio: (fd.get("bio") as string) || null,
    };
    const { error } = editingArtist
      ? await supabase.from("artists").update(row).eq("id", editingArtist.id)
      : await supabase.from("artists").insert(row);
    if (error) { alert("Error: " + error.message); return; }
    await loadData();
    setShowArtistForm(false);
    setEditingArtist(null);
  }

  async function deleteArtist(id: string) {
    if (!confirm("Delete this artist? Their artworks will also be deleted.")) return;
    await supabase.from("artists").delete().eq("id", id);
    await loadData();
  }

  // ── Render guards ─────────────────────────────────────────────────────────

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <p className="text-stone-400 text-sm">Checking session...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="flex items-center justify-center w-16 h-16 bg-stone-900 rounded-2xl mx-auto mb-6">
            <Lock className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-bold text-center text-stone-900 mb-1">Admin Access</h1>
          <p className="text-sm text-stone-500 text-center mb-6">
            Sign in with your Supabase account email and password
          </p>
          {authError && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg mb-4">{authError}</div>
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" required autoFocus
            className="w-full px-4 py-3 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300 mb-3"
          />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" required
            className="w-full px-4 py-3 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300 mb-4"
          />
          <button type="submit"
            className="w-full bg-stone-900 text-white font-semibold py-3 rounded-xl hover:bg-stone-700 transition-colors">
            Sign In
          </button>
          <p className="text-xs text-stone-400 text-center mt-4">
            Manage users in Supabase Dashboard → Authentication → Users
          </p>
        </form>
      </div>
    );
  }

  // ── Main admin UI ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Single merged header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <p className="font-bold text-stone-900 leading-none">Riga Contemporary</p>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-0.5">Admin Panel</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === "en" ? "lv" : "en")}
              className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors"
            >
              <Globe size={14} />
              <span className="font-medium uppercase">{lang === "en" ? "LV" : "EN"}</span>
            </button>
            <button onClick={handleLogout} className="text-sm text-stone-500 hover:text-stone-900">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 flex gap-6">
          {(["dashboard", "artworks", "artists"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab ? "border-stone-900 text-stone-900" : "border-transparent text-stone-400 hover:text-stone-600"
              }`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">

        {/* ── Dashboard ── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Dashboard</h2>
              <button onClick={loadStats} disabled={loadingStats}
                className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 disabled:opacity-50">
                <RefreshCw size={14} className={loadingStats ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: <Eye size={20} className="text-blue-500" />, bg: "bg-blue-50", label: "Total Views", value: stats?.totalViews, week: stats?.weekViews },
                { icon: <Heart size={20} className="text-pink-500" />, bg: "bg-pink-50", label: "Favorites", value: stats?.totalFavorites, week: stats?.weekFavorites },
                { icon: <Mail size={20} className="text-green-500" />, bg: "bg-green-50", label: "Interest Requests", value: stats?.totalInterests, week: stats?.weekInterests },
              ].map(({ icon, bg, label, value, week }) => (
                <div key={label} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-stone-900">{value ?? 0}</p>
                      <p className="text-xs text-stone-400">{label}</p>
                    </div>
                  </div>
                  <p className="text-xs text-stone-500">+{week ?? 0} this week</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={18} className="text-stone-400" />
                <h3 className="font-semibold text-stone-900">Most Viewed Artworks</h3>
              </div>
              {stats?.topArtworks.length ? (
                <div className="space-y-3">
                  {stats.topArtworks.map((art, i) => (
                    <div key={art.id} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-stone-100 rounded-full flex items-center justify-center text-xs font-medium text-stone-500">{i + 1}</span>
                        <span className="text-sm text-stone-700">{art.title}</span>
                      </div>
                      <span className="text-sm text-stone-400">{art.views} views</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-stone-400">No view data yet</p>}
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-stone-900 mb-4">Recent Interest Requests</h3>
              {stats?.recentInterests.length ? (
                <div className="space-y-4">
                  {stats.recentInterests.map((interest) => (
                    <div key={interest.id} className="border-b border-stone-100 pb-4 last:border-0">
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-sm text-stone-900">{interest.artwork_title}</span>
                        <span className="text-xs text-stone-400">{new Date(interest.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-stone-600">{interest.name || "Anonymous"} — {interest.email}</p>
                      {interest.message && <p className="text-xs text-stone-400 mt-1 line-clamp-2">{interest.message}</p>}
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-stone-400">No interest requests yet</p>}
            </div>
          </div>
        )}

        {/* ── Artworks ── */}
        {activeTab === "artworks" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">
                Artworks {artworks.length > 0 && `(${artworks.length})`}
              </h2>
              <button onClick={() => openArtworkForm(null)}
                className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
                <Plus size={16} /> Add Artwork
              </button>
            </div>

            {artworks.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <ImageIcon className="mx-auto text-stone-200 mb-4" size={48} />
                <p className="text-stone-500 mb-2">No artworks yet</p>
                <button onClick={() => openArtworkForm(null)}
                  className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium mt-4">
                  <Plus size={16} /> Add First Artwork
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {artworks.map((aw) => {
                  const thumb = aw.images?.[0]?.path ?? aw.image_path;
                  const src = resolveUrl(thumb);
                  const extraImages = (aw.images?.length ?? 0) - 1;
                  return (
                    <div key={aw.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                      <div className="aspect-square bg-stone-100 relative">
                        {src ? (
                          <img src={src} alt={aw.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            {aw.model_type || aw.model_path
                              ? <Box size={32} className="text-stone-300" />
                              : <ImageIcon size={32} className="text-stone-300" />}
                          </div>
                        )}
                        {extraImages > 0 && (
                          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                            +{extraImages}
                          </span>
                        )}
                        {(aw.model_type || aw.model_path) && (
                          <span className="absolute top-2 left-2 bg-stone-900 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">
                            3D
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-stone-900 truncate">{aw.title}</p>
                        <p className="text-xs text-stone-400">{aw.year} · €{aw.price?.toLocaleString()}</p>
                        <div className="flex gap-3 mt-2">
                          <button onClick={() => openArtworkForm(aw)}
                            className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900">
                            <Edit2 size={12} /> Edit
                          </button>
                          <button onClick={() => deleteArtwork(aw.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Artwork form modal */}
            {showArtworkForm && (
              <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
                <form
                  onSubmit={(e) => { e.preventDefault(); saveArtwork(new FormData(e.currentTarget)); }}
                  className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto"
                >
                  <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between z-10">
                    <h3 className="font-semibold text-stone-900">
                      {editingArtwork ? "Edit Artwork" : "New Artwork"}
                    </h3>
                    <button type="button" onClick={closeArtworkForm}>
                      <X size={20} className="text-stone-400 hover:text-stone-600" />
                    </button>
                  </div>

                  <div className="p-6 space-y-5">

                    {/* ── Images ── */}
                    <section>
                      <label className="block text-xs text-stone-500 uppercase tracking-wider mb-2">
                        Images
                      </label>

                      {/* Existing images */}
                      <div className="flex gap-2 flex-wrap mb-3">
                        {existingImages.map((img) => (
                          <div key={img.id} className="relative w-20 h-20 rounded-lg overflow-hidden bg-stone-100">
                            <img src={resolveUrl(img.path)} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeExistingImage(img.id)}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-500">
                              <X size={10} />
                            </button>
                          </div>
                        ))}

                        {/* New image previews */}
                        {newImagePreviews.map((src, i) => (
                          <div key={`new-${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden bg-stone-100">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeNewImage(i)}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-500">
                              <X size={10} />
                            </button>
                          </div>
                        ))}

                        {/* Add button */}
                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-200 flex flex-col items-center justify-center cursor-pointer hover:border-stone-400 transition-colors text-stone-300 hover:text-stone-500">
                          <input type="file" multiple accept="image/jpeg,image/png,image/webp"
                            onChange={handleImageSelect} className="hidden" />
                          <Upload size={18} />
                          <span className="text-[10px] mt-1">Add</span>
                        </label>
                      </div>
                      <p className="text-xs text-stone-400">
                        First image is used as thumbnail on the listing page. All images are swipeable on the detail page.
                      </p>

                      {/* Image fit toggle + live preview */}
                      {(existingImages.length > 0 || newImagePreviews.length > 0) && (
                        <div className="mt-4">
                          <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Image fit</p>
                          <div className="flex gap-2 mb-3">
                            {(["cover", "contain"] as const).map((fit) => (
                              <button key={fit} type="button" onClick={() => setImageFit(fit)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  imageFit === fit ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                                }`}>
                                {fit === "cover" ? "Fill (crop edges)" : "Contain (show full image)"}
                              </button>
                            ))}
                          </div>
                          {/* Live preview of the first image with selected fit */}
                          <div className="w-full aspect-square rounded-xl overflow-hidden" style={{ background: "#faf7f1" }}>
                            <img
                              src={existingImages[0] ? resolveUrl(existingImages[0].path) : newImagePreviews[0]}
                              alt="fit preview"
                              className={`w-full h-full ${imageFit === "contain" ? "object-contain" : "object-cover"}`}
                            />
                          </div>
                        </div>
                      )}
                    </section>

                    {/* ── Title + Artist ── */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Title *</label>
                        <input name="title" required defaultValue={editingArtwork?.title}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Artist</label>
                        <select name="artist_id" defaultValue={editingArtwork?.artist_id}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300">
                          <option value="">No artist</option>
                          {artists.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* ── Year / Price / Category ── */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Year</label>
                        <input name="year" type="number" defaultValue={editingArtwork?.year ?? new Date().getFullYear()}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Price (€)</label>
                        <input name="price" type="number" defaultValue={editingArtwork?.price}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Category</label>
                        <select name="category" defaultValue={editingArtwork?.category ?? "painting"}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300">
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* ── Size / Technique ── */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Size</label>
                        <input name="size" placeholder="e.g., 80 × 60 cm" defaultValue={editingArtwork?.size}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Technique</label>
                        <input name="technique" placeholder="e.g., Oil on canvas" defaultValue={editingArtwork?.technique}
                          className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                      </div>
                    </div>

                    {/* ── Description ── */}
                    <div>
                      <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Description</label>
                      <textarea name="description" rows={3} defaultValue={editingArtwork?.description}
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300 resize-none" />
                    </div>

                    {/* ── 3D Model ── */}
                    <section className="border-t border-stone-100 pt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Box size={16} className="text-stone-400" />
                        <span className="text-xs text-stone-500 uppercase tracking-wider">3D Model</span>
                      </div>

                      <div className="flex gap-2 mb-4">
                        {(["none", "procedural", "glb"] as const).map((mode) => (
                          <button key={mode} type="button" onClick={() => setModelMode(mode)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              modelMode === mode
                                ? "bg-stone-900 text-white"
                                : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                            }`}>
                            {mode === "none" ? "None" : mode === "procedural" ? "Procedural" : "Upload GLB"}
                          </button>
                        ))}
                      </div>

                      {modelMode === "procedural" && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-stone-500 mb-1">Model Type</label>
                            <select name="model_type" defaultValue={editingArtwork?.model_type ?? "knot"}
                              className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300">
                              {MODEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-stone-500 mb-1">Color</label>
                            <input name="model_color" type="color"
                              defaultValue={editingArtwork?.model_color ?? "#ff6b35"}
                              className="w-full h-10 rounded-xl bg-stone-100 cursor-pointer" />
                          </div>
                        </div>
                      )}

                      {modelMode === "glb" && (
                        <div className="space-y-4">
                          {/* File picker */}
                          <label className="flex items-center gap-3 border-2 border-dashed border-stone-200 rounded-xl p-4 cursor-pointer hover:border-stone-400 transition-colors">
                            <input type="file" accept=".glb" onChange={handleGlbSelect} className="hidden" />
                            <Box size={20} className="text-stone-300 shrink-0" />
                            <div>
                              <p className="text-sm text-stone-600">
                                {glbFile ? glbFile.name : editingArtwork?.model_path ? "Current: " + editingArtwork.model_path.split("/").pop() : "Choose a .glb file"}
                              </p>
                              <p className="text-xs text-stone-400 mt-0.5">
                                {glbFile ? `${(glbFile.size / 1024 / 1024).toFixed(1)} MB` : "Max 10 MB"}
                              </p>
                            </div>
                          </label>

                          {/* Live preview + scale slider */}
                          {(glbPreviewUrl || editingArtwork?.model_path) && (
                            <div>
                              <p className="text-xs text-stone-500 uppercase tracking-wider mb-2">Preview</p>
                              <div className="w-full aspect-square rounded-xl overflow-hidden" style={{ background: "#faf7f1" }}>
                                <GLBPreview
                                  url={glbPreviewUrl ?? resolveUrl(editingArtwork!.model_path)}
                                  spinning
                                  scale={modelScale}
                                />
                              </div>

                              {/* Scale slider shown below the preview */}
                              <div className="mt-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-stone-500">Model size</span>
                                  <span className="text-xs font-medium text-stone-700 tabular-nums">{modelScale.toFixed(1)}×</span>
                                </div>
                                <input
                                  type="range" min="0.1" max="4.0" step="0.1"
                                  value={modelScale}
                                  onChange={(e) => setModelScale(parseFloat(e.target.value))}
                                  className="w-full accent-stone-900"
                                />
                                <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                                  <span>0.1× tiny</span>
                                  <span>1.0× auto-fit</span>
                                  <span>4.0× large</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Scale slider without preview (no model loaded yet) */}
                          {!glbPreviewUrl && !editingArtwork?.model_path && (
                            <p className="text-xs text-stone-400">Upload a .glb file above to see a live preview and adjust the scale.</p>
                          )}
                        </div>
                      )}
                    </section>

                    {/* ── Submit ── */}
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={closeArtworkForm}
                        className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors">
                        Cancel
                      </button>
                      <button type="submit" disabled={uploading}
                        className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-700 transition-colors disabled:opacity-50">
                        {uploading ? "Saving..." : editingArtwork ? "Save Changes" : "Create Artwork"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* ── Artists ── */}
        {activeTab === "artists" && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">
                Artists {artists.length > 0 && `(${artists.length})`}
              </h2>
              <button onClick={() => { setShowArtistForm(true); setEditingArtist(null); }}
                className="flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-stone-700 transition-colors">
                <Plus size={16} /> Add Artist
              </button>
            </div>

            {artists.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center">
                <p className="text-stone-500 mb-2">No artists yet</p>
                <button onClick={() => setShowArtistForm(true)}
                  className="inline-flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium mt-4">
                  <Plus size={16} /> Add First Artist
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                {artists.map((artist, i) => (
                  <div key={artist.id}
                    className={`flex items-center justify-between p-4 ${i > 0 ? "border-t border-stone-100" : ""}`}>
                    <div>
                      <p className="font-medium text-stone-900">{artist.name}</p>
                      {artist.nationality && <p className="text-sm text-stone-400">{artist.nationality}</p>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => { setEditingArtist(artist); setShowArtistForm(true); }}
                        className="text-stone-400 hover:text-stone-600"><Edit2 size={16} /></button>
                      <button onClick={() => deleteArtist(artist.id)}
                        className="text-stone-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showArtistForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                <form onSubmit={saveArtist} className="bg-white rounded-2xl w-full max-w-md">
                  <div className="border-b border-stone-100 px-6 py-4 flex items-center justify-between">
                    <h3 className="font-semibold text-stone-900">
                      {editingArtist ? "Edit Artist" : "New Artist"}
                    </h3>
                    <button type="button" onClick={() => { setShowArtistForm(false); setEditingArtist(null); }}>
                      <X size={20} className="text-stone-400 hover:text-stone-600" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Name *</label>
                      <input name="name" required defaultValue={editingArtist?.name}
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Nationality</label>
                      <input name="nationality" placeholder="e.g., Latvian" defaultValue={editingArtist?.nationality}
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300" />
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 uppercase tracking-wider mb-1">Bio</label>
                      <textarea name="bio" rows={4} defaultValue={editingArtist?.bio}
                        className="w-full px-4 py-2.5 rounded-xl bg-stone-100 text-sm outline-none focus:ring-2 focus:ring-stone-300 resize-none" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => { setShowArtistForm(false); setEditingArtist(null); }}
                        className="flex-1 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50">
                        Cancel
                      </button>
                      <button type="submit"
                        className="flex-1 py-3 rounded-xl bg-stone-900 text-white font-medium hover:bg-stone-700">
                        {editingArtist ? "Save Changes" : "Create Artist"}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
