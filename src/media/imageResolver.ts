// Resolución de imágenes públicas, gratuita y sin API keys.
// Usa APIs de búsqueda que devuelven HTTP 200 aunque no haya resultados.
// Evita /page/summary/{texto libre}, origen de los 404 visibles en consola.

const resultCache = new Map<string, string | null>();
const pendingCache = new Map<string, Promise<string | null>>();

function isHttpUrl(value: string | undefined | null): boolean {
  return Boolean(value && /^https?:\/\//i.test(value));
}

async function fetchJson(url: string, timeoutMs = 7000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    window.clearTimeout(timer);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function cached(key: string, loader: () => Promise<string | null>) {
  if (resultCache.has(key)) return Promise.resolve(resultCache.get(key) ?? null);
  const pending = pendingCache.get(key);
  if (pending) return pending;
  const promise = loader().then((result) => {
    resultCache.set(key, result);
    pendingCache.delete(key);
    return result;
  });
  pendingCache.set(key, promise);
  return promise;
}

/**
 * MediaWiki Action API: devuelve 200 + lista vacía si no hay coincidencia,
 * a diferencia de REST page/summary, que ensuciaba consola con 404.
 */
async function wikipediaSearchThumbnail(
  query: string,
  lang: "es" | "en",
): Promise<string | null> {
  const normalized = query.trim();
  if (normalized.length < 3) return null;
  const key = `wikipedia:${lang}:${normalized}`;
  return cached(key, async () => {
    const url =
      `https://${lang}.wikipedia.org/w/api.php` +
      `?action=query&generator=search` +
      `&gsrsearch=${encodeURIComponent(normalized)}` +
      `&gsrnamespace=0&gsrlimit=5&prop=pageimages` +
      `&piprop=thumbnail|original&pithumbsize=720` +
      `&format=json&origin=*`;
    const data = await fetchJson(url);
    const pages = Object.values(data?.query?.pages ?? {}) as any[];
    for (const page of pages) {
      const image = page?.thumbnail?.source ?? page?.original?.source;
      if (isHttpUrl(image)) return image;
    }
    return null;
  });
}

/** Wikimedia Commons: archivos públicos con metadata de licencia. */
async function wikimediaSearch(query: string): Promise<string | null> {
  const normalized = query.trim();
  if (normalized.length < 3) return null;
  const key = `commons:${normalized}`;
  return cached(key, async () => {
    const url =
      `https://commons.wikimedia.org/w/api.php` +
      `?action=query&generator=search` +
      `&gsrsearch=${encodeURIComponent(normalized)}` +
      `&gsrnamespace=6&gsrlimit=8&prop=imageinfo` +
      `&iiprop=url|mime|extmetadata&iiurlwidth=720` +
      `&format=json&origin=*`;
    const data = await fetchJson(url);
    const pages = Object.values(data?.query?.pages ?? {}) as any[];
    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      const image = info?.thumburl ?? info?.url;
      const mime = String(info?.mime ?? "");
      if (
        isHttpUrl(image) &&
        (mime.startsWith("image/") || /\.(jpe?g|png|webp)(\?|$)/i.test(image))
      ) {
        return image;
      }
    }
    return null;
  });
}

function looksLikeEntityName(value: string) {
  const words = value.trim().split(/\s+/);
  return (
    words.length <= 7 &&
    !/\b(painting|public domain|sacred art|gospel|wikimedia|catholic|arte sacro)\b/i.test(
      value,
    )
  );
}

export async function resolvePublicImage(
  queryOrUrl: string | undefined | null,
  fallback: string,
): Promise<string> {
  if (!queryOrUrl) return fallback;
  const query = queryOrUrl.trim();
  if (isHttpUrl(query)) return query;
  if (query.length < 3) return fallback;

  if (looksLikeEntityName(query)) {
    const es = await wikipediaSearchThumbnail(query, "es");
    if (es) return es;
    const en = await wikipediaSearchThumbnail(query, "en");
    if (en) return en;
  }
  return (await wikimediaSearch(query)) ?? fallback;
}

export async function resolveSaintImage(
  saintName: string | undefined,
  existingUrl: string | undefined,
): Promise<{ url: string | null; isPlaceholder: boolean }> {
  if (isHttpUrl(existingUrl)) return { url: existingUrl!, isPlaceholder: false };
  if (!saintName) return { url: null, isPlaceholder: true };

  const candidates = [
    saintName,
    saintName.replace(/^San(?:ta|to)?\s+/i, ""),
    existingUrl && !isHttpUrl(existingUrl) ? existingUrl : "",
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const es = await wikipediaSearchThumbnail(candidate, "es");
    if (es) return { url: es, isPlaceholder: false };
    const en = await wikipediaSearchThumbnail(candidate, "en");
    if (en) return { url: en, isPlaceholder: false };
  }
  for (const query of [`${saintName} santo`, `${saintName} Catholic saint painting`]) {
    const image = await wikimediaSearch(query);
    if (image) return { url: image, isPlaceholder: false };
  }
  return { url: null, isPlaceholder: true };
}

/** Prioriza arte sacro católico de dominio público en Commons. */
export async function resolveCatholicImage(
  subject: string | undefined,
  gospelRef: string | undefined,
): Promise<string | null> {
  const base = (subject || gospelRef || "Jesus Christ").trim();
  for (const query of [
    `${base} Catholic religious painting`,
    `${base} sacred art Jesus Christ`,
    `${base} arte sacro católico`,
  ]) {
    const image = await wikimediaSearch(query);
    if (image) return image;
  }
  return null;
}

export async function resolveDailyImage(
  imagePromptOrUrl: string | undefined,
  gospelRef: string | undefined,
  quote: string | undefined,
): Promise<string> {
  const fallback = "/images/daily.jpg";
  // Prioritize the custom image URL if it exists
  if (isHttpUrl(imagePromptOrUrl)) return imagePromptOrUrl!;

  const subject = imagePromptOrUrl || gospelRef || quote || "Jesus Christ Gospel";
  const catholic = await resolveCatholicImage(subject, gospelRef);
  if (catholic) return catholic;
  return (await wikimediaSearch(`${subject} painting public domain`)) ?? fallback;
}