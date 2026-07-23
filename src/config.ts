export const WORKER_API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  "https://camino-api.byp.workers.dev";

export const FRONTEND_URL =
  (import.meta.env.VITE_FRONTEND_URL as string | undefined) ??
  "https://camino-6vx.pages.dev";

export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";
