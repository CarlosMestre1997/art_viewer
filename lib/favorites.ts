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