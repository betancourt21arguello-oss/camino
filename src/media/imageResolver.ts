// 100% gratuito, sin API keys.
// Estrategia: Gemini NO genera imágenes, solo sugiere términos de búsqueda.
// Aquí resolvemos esos términos a URLs públicas reales.
//
// Orden de resolución (todo CORS habilitado, sin keys):
// 1. Si ya es http URL, se usa directo.
// 2. Wikipedia (es → en) summary API → thumbnail.source (Wikimedia Commons detrás).
// 3. Wikimedia Commons search API → imageinfo.url
// 4. Fallback local /images/daily.jpg o placeholder con inicial.

const WIKI_CACHE = new Map<string, string | null>();

function isHttpUrl(s: string | undefined | null): boolean {
  if (!s) return false;
  return /^https?:\/\//i.test(s);
}

async function fetchJson(url: string, timeoutMs = 6000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function wikipediaThumbnail(title: string, lang: "es" | "en"): Promise<string | null> {
  const key = `wiki:${lang}:${title}`;
  if (WIKI_CACHE.has(key)) return WIKI_CACHE.get(key)!;

  // Title needs underscores, encoded
  const encoded = encodeURIComponent(title.replace(/ /g, "_"));
  const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
  const data = await fetchJson(url);
  const thumb = data?.thumbnail?.source || data?.originalimage?.source || null;
  if (thumb) WIKI_CACHE.set(key, thumb);
  return thumb;
}

async function wikimediaSearch(query: string): Promise<string | null> {
  const key = `commons:${query}`;
  if (WIKI_CACHE.has(key)) return WIKI_CACHE.get(key)!;

  // Search files in Commons
  const searchUrl =
    `https://commons.wikimedia.org/w/api.php` +
    `?action=query` +
    `&generator=search` +
    `&gsrsearch=${encodeURIComponent(query)}` +
    `&gsrnamespace=6` +
    `&gsrlimit=6` +
    `&prop=imageinfo` +
    `&iiprop=url|mime|extmetadata` +
    `&iiurlwidth=640` +
    `&format=json` +
    `&origin=*`;

  const data = await fetchJson(searchUrl);
  const pages = data?.query?.pages;
  if (!pages) return null;

  // Pick first image/* result with a usable url
  for (const p of Object.values(pages) as any[]) {
    const info = p?.imageinfo?.[0];
    const url = info?.thumburl || info?.url;
    const mime = info?.mime || "";
    if (url && (mime.startsWith("image/") || url.match(/\.(jpg|jpeg|png|webp)(\?|$)/i))) {
      WIKI_CACHE.set(key, url);
      return url;
    }
  }
  return null;
}

/**
 * Resuelve un término de búsqueda a una URL pública gratuita.
 * NO usa APIs de pago, NO requiere keys.
 */
export async function resolvePublicImage(
  queryOrUrl: string | undefined | null,
  fallback: string,
): Promise<string> {
  if (!queryOrUrl) return fallback;
  const trimmed = queryOrUrl.trim();
  if (isHttpUrl(trimmed)) return trimmed;
  if (trimmed.length < 3) return fallback;

  const q = trimmed;

  // Try direct Wikipedia titles (es first, then en)
  const candidates = [
    q,
    q.replace(/^San\s+/i, ""),
    q.replace(/^Santa\s+/i, ""),
    q.replace(/^Santo\s+/i, ""),
  ];

  for (const c of candidates) {
    const thumbEs = await wikipediaThumbnail(c, "es");
    if (thumbEs) return thumbEs;
  }
  for (const c of candidates) {
    const thumbEn = await wikipediaThumbnail(c, "en");
    if (thumbEn) return thumbEn;
  }

  // Try Commons search with a few query variants
  const searchVariants = [
    q,
    `${q} saint painting`,
    `${q} santo`,
    `${q} catholic`,
  ];

  for (const sq of searchVariants) {
    const url = await wikimediaSearch(sq);
    if (url) return url;
  }

  return fallback;
}

// Convenience wrappers with local fallbacks
export async function resolveSaintImage(
  saintName: string | undefined,
  existingUrl: string | undefined,
): Promise<{ url: string | null; isPlaceholder: boolean }> {
  if (isHttpUrl(existingUrl)) return { url: existingUrl!, isPlaceholder: false };
  if (!saintName) return { url: null, isPlaceholder: true };

  // If existingUrl is actually a search term from Gemini (not http), resolve it
  const searchTerm = existingUrl && !isHttpUrl(existingUrl) ? existingUrl : saintName;
  const resolved = await resolvePublicImage(searchTerm, "");
  if (resolved) return { url: resolved, isPlaceholder: false };
  // Try saint name directly
  const byName = await resolvePublicImage(saintName, "");
  if (byName) return { url: byName, isPlaceholder: false };
  return { url: null, isPlaceholder: true };
}

export async function resolveDailyImage(
  imagePromptOrUrl: string | undefined,
  gospelRef: string | undefined,
  quote: string | undefined,
): Promise<string> {
  const fallback = "/images/daily.jpg";
  if (isHttpUrl(imagePromptOrUrl)) return imagePromptOrUrl!;

  // Build search query from Gemini's prompt / gospel / quote
  const query =
    imagePromptOrUrl ||
    (gospelRef ? `Gospel ${gospelRef} painting renaissance public domain` : "") ||
    quote ||
    "Bible";

  return resolvePublicImage(query, fallback);
}
