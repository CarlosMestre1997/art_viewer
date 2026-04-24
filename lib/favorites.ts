"use client";

const KEY = "rc_favorites";

export function getFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function toggleFavorite(id: string): string[] {
  const current = getFavorites();
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function isFavorite(id: string): boolean {
  return getFavorites().includes(id);
}
