const normalizeBase = (v: string | undefined) => {
  const raw = v?.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    return new URL("https://" + raw).toString();
  } catch {
    return "";
  }
};

export const WORKER_API_BASE = normalizeBase(import.meta.env.VITE_API_BASE);

export const FRONTEND_URL = normalizeBase(import.meta.env.VITE_FRONTEND_URL);

export const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ?? "";
