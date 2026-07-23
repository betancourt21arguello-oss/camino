import type { CommunityWorkSeed } from "./types";

const KEY = "camino-prayer-gallery";

export function loadGallery(): CommunityWorkSeed[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CommunityWorkSeed[];
  } catch {
    return [];
  }
}

export function saveWork(work: CommunityWorkSeed) {
  const all = loadGallery().filter((w) => w.id !== work.id);
  all.unshift(work);
  window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, 40)));
}

export function clearGallery() {
  window.localStorage.removeItem(KEY);
}
