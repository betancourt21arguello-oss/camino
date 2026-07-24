const normalizeBase = (v: string | undefined, fallback: string) => {
  const raw = v?.trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL(raw, "https://camino-6vx.pages.dev").toString();
  } catch {
    return fallback;
  }
};

export const WORKER_API_BASE = normalizeBase(
  import.meta.env.VITE_API_BASE as string | undefined,
  "https://camino-api.byp.workers.dev",
);

export const FRONTEND_URL =
  (import.meta.env.VITE_FRONTEND_URL as string | undefined) ??
  "https://camino-6vx.pages.dev";

export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";
