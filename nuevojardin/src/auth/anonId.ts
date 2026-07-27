const ANON_KEY = "camino_anon_id";

export function getAnonIdentity(): string {
  if (typeof window === "undefined") return "anon-ssr";
  let id = localStorage.getItem(ANON_KEY);
  if (!id) {
    id = "anon-" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(ANON_KEY, id);
  }
  return id;
}
