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

export async function trackView(artworkId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) return;

  await supabase.from("artwork_views").insert({
    artwork_id: artworkId,
    session_id: sessionId,
  });
}
