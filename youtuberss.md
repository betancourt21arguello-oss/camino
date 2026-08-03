# YouTube RSS — Laudes, Vísperas y Completas

## Resumen

La aplicación **Camino** obtiene automáticamente los videos de oración (Laudes, Vísperas y Completas) del canal de YouTube **Cathopray** (`UCSgJ9Ppudkzs9cD259tjMQw`) mediante su **feed RSS público** (`https://www.youtube.com/feeds/videos.xml?channel_id=...`). El proceso se ejecuta en un **Cloudflare Worker** que:

1. Descarga el feed RSS del canal.
2. Parsea el XML y extrae los títulos y URLs de los videos.
3. Clasifica cada video según su título: `laudes`, `vísperas`/`visperas` o `completas`.
4. Guarda las URLs en la tabla `oraciones_diarias` de **Supabase** (una fila por fecha).
5. Inyecta los videos como partes `kind: "video"` dentro de las horas litúrgicas (`laudes`, `vespers`, `compline`) de la respuesta `/daily`.
6. El frontend los muestra como **iframes embebidos de YouTube** en el portal de oración.

---

## Arquitectura

```
┌─────────────┐   GET /youtube/prayer-videos   ┌──────────────────────┐
│  Frontend   │ ─────────────────────────────► │  Cloudflare Worker   │
│ (AdminPortal│                               │  (worker/src/index.ts)│
│  /DailyPrayer│ ◄───────────────────────────── │                      │
│  Portal)    │   JSON {laudes, visperas,      │                      │
└─────────────┘   completas}                   └──────────┬───────────┘
                                                          │
                                                          │ 1. GET https://www.youtube.com/feeds/videos.xml?channel_id=UCSgJ9Ppudkzs9cD259tjMQw
                                                          ▼
                                                   ┌──────────────┐
                                                   │  YouTube RSS │
                                                   └──────────────┘
                                                          │
                                                          │ 2. Parsear XML → extraer títulos + URLs
                                                          ▼
                                                   ┌──────────────┐
                                                   │  Supabase    │
                                                   │ oraciones_diarias │
                                                   └──────────────┘
                                                          │
                                                          │ 3. GET /daily → injectPrayerVideos()
                                                          ▼
                                                   ┌──────────────┐
                                                   │  Respuesta   │
                                                   │  /daily      │
                                                   └──────────────┘
```

---

## 1. Constante del feed RSS

**Archivo:** `worker/src/index.ts` (línea 642)

```ts
const YOUTUBE_RSS_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=UCSgJ9Ppudkzs9cD259tjMQw";
```

- Canal: **Cathopray** (ID `UCSgJ9Ppudkzs9cD259tjMQw`).
- El feed devuelve los **últimos 15 videos** publicados en el canal en formato XML (Atom).

---

## 2. Validación de URLs de YouTube

**Archivo:** `worker/src/index.ts` (líneas 644–656)

```ts
function isValidYouTubeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "www.youtube.com" ||
        u.hostname === "youtube.com" ||
        u.hostname === "youtu.be") &&
      (u.protocol === "https:" || u.protocol === "http:")
    );
  } catch {
    return false;
  }
}
```

- Solo acepta URLs de `youtube.com`, `www.youtube.com` o `youtu.be`.
- Solo protocolos `https:` o `http:`.
- Si el URL no es válido, se descarta.

---

## 3. Función principal: `fetchYouTubePrayerVideos()`

**Archivo:** `worker/src/index.ts` (líneas 658–693)

```ts
async function fetchYouTubePrayerVideos(): Promise<{ laudes?: string; visperas?: string; completas?: string }> {
  const response = await fetch(YOUTUBE_RSS_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`YouTube RSS fetch failed: ${response.status} ${text.slice(0, 200)}`);
  }
  const xml = await response.text();
  const entradas = xml.split("<entry>").slice(1);

  const oraciones: { laudes?: string; visperas?: string; completas?: string } = {};

  for (const entry of entradas) {
    const tituloMatch = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkMatch = entry.match(/<link[^>]+href="([^"]+)"/i);

    if (tituloMatch && linkMatch) {
      const titulo = tituloMatch[1].replace(/<[^>]+>/g, "").toLowerCase();
      let url = linkMatch[1];

      if (!isValidYouTubeUrl(url)) continue;

      if (titulo.includes("laudes") && !oraciones.laudes) oraciones.laudes = url;
      if ((titulo.includes("vísperas") || titulo.includes("visperas")) && !oraciones.visperas) oraciones.visperas = url;
      if (titulo.includes("completas") && !oraciones.completas) oraciones.completas = url;
    }

    if (oraciones.laudes && oraciones.visperas && oraciones.completas) break;
  }

  return oraciones;
}
```

### Comportamiento detallado

| Paso | Descripción |
|------|-------------|
| **1. Fetch** | Hace `GET` al feed RSS con un `User-Agent` de navegador real (Chrome 120) y `Accept` de XML/RSS para evitar bloqueos de YouTube. |
| **2. Validación HTTP** | Si la respuesta no es `ok` (2xx), lanza error con el status y los primeros 200 caracteres del cuerpo. |
| **3. Parseo XML** | Divide el XML por `<entry>` (cada `<entry>` es un video). Ignora el primer elemento (cabecera del feed). |
| **4. Extracción** | Para cada entrada, extrae el `<title>` y el primer `<link href="...">`. |
| **5. Limpieza del título** | Elimina etiquetas HTML del título y lo convierte a minúsculas. |
| **6. Validación URL** | Solo acepta URLs de YouTube válidos. |
| **7. Clasificación** | Busca palabras clave en el título: |
|   | - `laudes` → `oraciones.laudes` |
|   | - `vísperas` o `visperas` → `oraciones.visperas` |
|   | - `completas` → `oraciones.completas` |
| **8. Primer match** | Solo asigna la **primera** URL encontrada para cada categoría (no sobrescribe si ya existe). |
| **9. Early exit** | Si ya encontró las tres oraciones, rompe el bucle (optimización). |
| **10. Retorno** | Devuelve un objeto `{ laudes?, visperas?, completas? }` — los campos pueden faltar si no se encontraron. |

---

## 4. Persistencia en Supabase

### 4.1 Tabla `oraciones_diarias`

**Archivo:** `supabase/migrations/20260728_oraciones_diarias.sql`

```sql
CREATE TABLE IF NOT EXISTS public.oraciones_diarias (
  fecha date PRIMARY KEY,
  laudes text,
  visperas text,
  completas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.oraciones_diarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.oraciones_diarias
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access" ON public.oraciones_diarias
  FOR SELECT USING (true);
```

- **PK:** `fecha` (una fila por día).
- **Columnas:** `laudes`, `visperas`, `completas` (texto con la URL del video).
- **RLS:** Solo el `service_role` puede escribir; lectura pública permitida.

### 4.2 `supabaseFetchOraciones(env, date)`

**Archivo:** `worker/src/index.ts` (líneas 695–714)

- Consulta `GET /rest/v1/oraciones_diarias?fecha=eq.{date}`.
- Si la tabla no existe (HTTP 404), retorna `null` (no lanza error).
- Retorna la primera fila o `null`.

### 4.3 `supabaseUpsertOraciones(env, date, oraciones)`

**Archivo:** `worker/src/index.ts` (líneas 716–739)

- Hace `POST` a `/rest/v1/oraciones_diarias` con `Prefer: resolution=merge-duplicates`.
- Inserta o actualiza la fila para la fecha con los tres URLs.
- Campos: `fecha`, `laudes`, `visperas`, `completas`, `updated_at`.

---

## 5. Inyección de videos en la liturgia: `injectPrayerVideos()`

**Archivo:** `worker/src/index.ts` (líneas 741–766)

```ts
async function injectPrayerVideos(liturgy: any, oraciones: { laudes?: string; visperas?: string; completas?: string }): any {
  const videoPart = (url: string) => ({
    kind: "video",
    label: "Video",
    text: "",
    content: url,
    type: "video",
  });

  if (!liturgy.laudes) liturgy.laudes = { title: "Laudes", hour: "07:00", mood: "dawn", parts: [] };
  if (oraciones.laudes && !liturgy.laudes.parts?.some((p: any) => p.kind === "video")) {
    liturgy.laudes.parts = [videoPart(oraciones.laudes), ...(liturgy.laudes.parts || [])];
  }

  if (!liturgy.vespers) liturgy.vespers = { title: "Vísperas", hour: "18:00", mood: "dusk", parts: [] };
  if (oraciones.visperas && !liturgy.vespers.parts?.some((p: any) => p.kind === "video")) {
    liturgy.vespers.parts = [videoPart(oraciones.visperas), ...(liturgy.vespers.parts || [])];
  }

  if (!liturgy.compline) liturgy.compline = { title: "Completas", hour: "21:00", mood: "night", parts: [] };
  if (oraciones.completas && !liturgy.compline.parts?.some((p: any) => p.kind === "video")) {
    liturgy.compline.parts = [videoPart(oraciones.completas), ...(liturgy.compline.parts || [])];
  }

  return liturgy;
}
```

### Comportamiento

- Crea una parte de tipo `video` con:
  - `kind: "video"`
  - `label: "Video"`
  - `text: ""`
  - `content: <URL de YouTube>`
  - `type: "video"`
- **Inserta el video al inicio** de `parts` (primera posición).
- **No duplica**: si ya existe una parte con `kind === "video"`, no la agrega de nuevo.
- Si la hora no existe en la liturgia, la crea con valores por defecto:
  - Laudes: `07:00`, mood `dawn`
  - Vísperas: `18:00`, mood `dusk`
  - Completas: `21:00`, mood `night`

---

## 6. Endpoints del Worker

### 6.1 `GET /youtube/prayer-videos`

**Archivo:** `worker/src/index.ts` (líneas 2208–2217)

```ts
if (url.pathname === "/youtube/prayer-videos" && request.method === "GET") {
  try {
    const oraciones = await fetchYouTubePrayerVideos();
    const today = getTodayKey();
    await supabaseUpsertOraciones(env, today, oraciones);
    return jsonResponse({ date: today, ...oraciones });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
```

- **Acción:** Descarga el feed RSS en vivo, extrae los URLs y los guarda en Supabase para la fecha de hoy (zona Caracas).
- **Respuesta:** `{ date: "YYYY-MM-DD", laudes?, visperas?, completas? }`.
- **Uso:** El panel de administración (`OracionesPanel`) lo llama con el botón **"Cargar del RSS"**.

### 6.2 `POST /youtube/prayer-videos`

**Archivo:** `worker/src/index.ts` (líneas 2219–2233)

```ts
if (url.pathname === "/youtube/prayer-videos" && request.method === "POST") {
  try {
    const body: any = await request.json().catch(() => ({}));
    const targetDate = typeof body?.date === "string" && body.date ? body.date : getTodayKey();
    const oraciones = {
      laudes: typeof body?.laudes === "string" ? body.laudes : undefined,
      visperas: typeof body?.visperas === "string" ? body.visperas : undefined,
      completas: typeof body?.completas === "string" ? body.completas : undefined,
    };
    await supabaseUpsertOraciones(env, targetDate, oraciones);
    return jsonResponse({ date: targetDate, ...oraciones });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
```

- **Acción:** Guarda URLs manuales (fallback de emergencia) para una fecha específica.
- **Body:** `{ date?: "YYYY-MM-DD", laudes?: string, visperas?: string, completas?: string }`.
- **Respuesta:** `{ date, laos, visperas, completas }`.

---

## 7. Integración con `/daily`

**Archivo:** `worker/src/index.ts` (líneas 2138–2161)

```ts
if (url.pathname === "/daily" && request.method === "GET") {
  try {
    const date = url.searchParams.get("date") || getTodayKey();
    let liturgy = await supabaseFetchDaily(env, date);
    if (!liturgy) liturgy = await cachedOrGenerate(env);

    let oraciones = null;
    try {
      oraciones = await supabaseFetchOraciones(env, date);
    } catch {
      console.warn("[daily] oraciones_diarias not available, skipping prayer videos");
    }
    if (oraciones) {
      liturgy = await injectPrayerVideos(liturgy, oraciones);
    }

    return jsonResponse(liturgy, 200, {
      "Cache-Control": "public, max-age=60, must-revalidate",
    });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}
```

- Al obtener la liturgia diaria, también consulta `oraciones_diarias` para la misma fecha.
- Si existen URLs guardados, los inyecta en `laudes.parts`, `vespers.parts` y `compline.parts` como partes de video.
- Si la tabla no existe, simplemente omite los videos (no rompe la respuesta).

---

## 8. Programación automática (Scheduled Handler)

**Archivo:** `worker/src/index.ts` (líneas 2561–2569)

```ts
async scheduled(_event: any, env: any, _ctx: ExecutionContext): Promise<void> {
  try {
    await cachedOrGenerate(env);
    await processReminders(env);
    await updatePrayerVideos(env);
  } catch (e) {
    console.error("Cron failed", e);
  }
}
```

Y la función `updatePrayerVideos`:

```ts
async function updatePrayerVideos(env: any): Promise<void> {
  try {
    const oraciones = await fetchYouTubePrayerVideos();
    const today = getTodayKey();
    await supabaseUpsertOraciones(env, today, oraciones);
    console.log("[PrayerVideos] Updated for", today, oraciones);
  } catch (e: any) {
    console.error("[PrayerVideos] Failed:", e.message);
  }
}
```

- **Cada día a las 00:00** (cron del Worker), se descarga el feed RSS y se actualiza la fila de hoy en `oraciones_diarias`.
- Si falla, se registra el error pero **no rompe** el resto del cron.

---

## 9. Frontend — Visualización de los videos

### 9.1 `DailyPrayerPortal.tsx`

**Archivo:** `src/screens/DailyPrayerPortal.tsx`

#### Función `getYouTubeEmbedUrl(url)`

```ts
function getYouTubeEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  let m = trimmed.match(/[?&]v=([^&]+)/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
  m = trimmed.match(/youtu\.be\/([^?&#]+)/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
  m = trimmed.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (m) return `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0&modestbranding=1`;
  m = trimmed.match(/youtube\.com\/embed\?listType=search&list=([^&]+)/);
  if (m) return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(m[1])}`;
  return null;
}
```

**Soporta 4 formatos de URL:**

| Formato | Ejemplo | Embed generado |
|---------|---------|----------------|
| `?v=` | `https://www.youtube.com/watch?v=abc123` | `https://www.youtube-nocookie.com/embed/abc123?rel=0&modestbranding=1` |
| `youtu.be` | `https://youtu.be/abc123` | `https://www.youtube-nocookie.com/embed/abc123?rel=0&modestbranding=1` |
| `/embed/` | `https://www.youtube.com/embed/abc123` | `https://www.youtube-nocookie.com/embed/abc123?rel=0&modestbranding=1` |
| `listType=search` | `https://www.youtube.com/embed?listType=search&list=...` | `https://www.youtube.com/embed?listType=search&list=...` |

- Usa `youtube-nocookie.com` para respetar la privacidad (sin cookies de seguimiento).
- Añade `rel=0` (no mostrar videos relacionados) y `modestbranding=1` (marca discreta).

### 9.2 Renderizado del video en `LaudesView`

```tsx
const isVideo = (part as any)?.type === "video" || (part as any)?.kind === "video";
const videoContent = (part as any)?.content;
```

Cuando la parte actual es de tipo `video`:

```tsx
{isVideo && (
  <div className="mt-2">
    {videoContent ? (() => {
      const ytEmbed = getYouTubeEmbedUrl(videoContent);
      if (ytEmbed) {
        return (
          <iframe
            src={ytEmbed}
            title="Video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full rounded-xl aspect-video"
            style={{ background: "#000", border: "none" }}
          />
        );
      }
      if (/^https?:\/\//i.test(videoContent.trim())) {
        return <video controls src={videoContent} className="w-full rounded-xl" style={{ background: "#000" }} />;
      }
      return <p>El video de esta sección estará disponible pronto.</p>;
    })() : (
      <p>El video de esta sección estará disponible pronto.</p>
    )}
  </div>
)}
```

- Si la URL es de YouTube → **iframe embebido**.
- Si es otra URL HTTP → **elemento `<video>`** nativo.
- Si no hay URL → mensaje "El video de esta sección estará disponible pronto."

---

## 10. Panel de administración: `OracionesPanel`

**Archivo:** `src/screens/AdminPortal.tsx` (líneas 1830–1956)

### Funcionalidad

| Elemento | Descripción |
|----------|-------------|
| **Fecha** | Selector de fecha (por defecto hoy en Caracas). |
| **Botón "Cargar del RSS"** | Llama `GET /youtube/prayer-videos`, descarga el feed en vivo y rellena los 3 inputs con las URLs encontradas. |
| **Input Laudes** | URL del video de Laudes (placeholder `https://www.youtube.com/watch?v=...`). |
| **Input Vísperas** | URL del video de Vísperas. |
| **Input Completas** | URL del video de Completas. |
| **Botón "Guardar URLs"** | Valida que cada URL comience con `http://` o `https://` y hace `POST /youtube/prayer-videos` con `{ date, laos, visperas, completas }`. |

### Validación en el frontend

```ts
if (laudes && !/^https?:\/\//i.test(laudes)) {
  setResult("❌ Laudes debe ser una URL válida (ej. https://www.youtube.com/watch?v=...)");
  return;
}
// Igual para visperas y completas
```

- Si el campo está vacío, se envía `null` (se limpia la URL guardada).
- Si no es una URL válida, muestra error y no envía.

---

## 11. Tipos de datos

### `HourPart` (src/liturgy/types.ts)

```ts
export interface HourPart {
  kind: "invitatory" | "hymn" | "psalmody" | "reading" | "gospelCanticle" | "intercessions" | "ourFather" | "concludingPrayer" | "marianAntiphon" | "examination" | "commendation" | "response" | "video";
  label: string;
  text: string;
  rubric?: string;
  response?: string;
  content?: string;
  type?: string;
}
```

- El tipo `"video"` fue añadido al union type para soportar las partes de video.
- `content` almacena la URL del video.
- `type` también se usa como `"video"` para compatibilidad.

### `HourLiturgy`

```ts
export interface HourLiturgy {
  title: string;
  body: string;
  hour?: string;
  mood?: "dawn" | "noon" | "dusk" | "night";
  parts: HourPart[];
}
```

---

## 12. Flujo completo (paso a paso)

### Escenario A: Usuario abre la app (GET /daily)

1. El frontend llama `GET /daily?date=YYYY-MM-DD`.
2. El Worker obtiene la liturgia de Supabase (o la genera con Gemini si no existe).
3. El Worker consulta `oraciones_diarias` para la misma fecha.
4. Si hay URLs guardados, `injectPrayerVideos()` los agrega como partes `video` al inicio de `laudes.parts`, `vespers.parts` y `compline.parts`.
5. La respuesta JSON incluye las horas con sus videos.
6. El usuario abre Laudes/Vísperas/Completas en `DailyPrayerPortal`.
7. `LaudesView` detecta la parte `kind: "video"`, convierte la URL a embed con `getYouTubeEmbedUrl()` y muestra un `<iframe>`.

### 2: Actualización automática diaria (Cron)

1. A las 00:00 (hora Caracas), el `scheduled` handler ejecuta `updatePrayerVideos(env)`.
2. Descarga el feed RSS de YouTube.
3. Extrae los URLs de Laudes, Vísperas y Completas.
4. Los guarda en `oraciones_diarias` para la fecha de hoy.
5. Cuando un usuario pida `/daily` hoy, verá los videos actualizados.

### 3: Actualización manual (Admin)

1. El admin abre el panel "Contenido" → "Oraciones del día".
2. Pulsa **"Cargar del RSS"** → `GET /youtube/prayer-videos` → descarga el feed en vivo y rellena los inputs.
3. Si algún video no se encontró automáticamente, el admin puede pegar la URL manualmente.
4. Pulsa **"Guardar URLs"** → `POST /youtube/prayer-videos` → guarda en Supabase para la fecha seleccionada.

---

## 13. Manejo de errores

| Escenario | Comportamiento |
|-----------|----------------|
| YouTube devuelve HTTP no-2xx | Lanza `YouTube RSS fetch failed: {status} {text}`. El endpoint devuelve `500` con el error. |
| URL no es de YouTube | Se descarta (no se asigna). |
| No se encuentra video de una categoría | El campo queda `undefined` y no se inyecta. |
| Tabla `oraciones_diarias` no existe | `supabaseFetchOraciones` retorna `null`; `/daily` continúa sin videos. |
| Fallo en el cron | Se registra `[PrayerVideos] Failed:` pero no rompe el resto del cron. |
| URL inválida en el admin | El frontend valida con regex `^https?://` y muestra error. |

---

## 14. Archivos involucrados

| Archivo | Rol |
|---------|-----|
| `worker/src/index.ts` | Lógica principal: fetch RSS, parseo, clasificación, persistencia, inyección, endpoints, cron. |
| `supabase/migrations/20260728_oraciones_diarias.sql` | Creación de la tabla `oraciones_diarias` con RLS. |
| `src/screens/DailyPrayerPortal.tsx` | Visualización de los videos embebidos en Laudes/Vísperas/Completas. |
| `src/screens/AdminPortal.tsx` | Panel de administración para cargar el RSS y guardar URLs manuales. |
| `src/liturgy/types.ts` | Tipos `HourPart` (con `kind: "video"`) y `HourLiturgy`. |
| `src/config.ts` | Define `WORKER_API_BASE` (base URL del Worker). |
| `test_rss.ps1` | Script de prueba del feed RSS. |
| `test_rss_variants.ps1` | Script de prueba de variantes del feed. |
| `test_channel.ps1` | Script de prueba del canal. |

---

## 15. Subtítulos sincronizados (Transcripts)

### 15.1 Resumen

La aplicación ahora extrae automáticamente el **transcript (subtítulos)** de cada video de Laudes, Vísperas y Completas usando la librería `youtube-transcript` en el Cloudflare Worker. El transcript se guarda en Supabase como columnas JSONB y se envía al frontend a través de `/daily`. El frontend usa `react-youtube` (YouTube Iframe Player API) para sincronizar el texto con el video en tiempo real.

### 15.2 Worker — Extracción del transcript

**Archivo:** `worker/src/index.ts`

```ts
import { YoutubeTranscript } from "youtube-transcript";

async function getTranscript(videoUrl: string): Promise<TranscriptLine[] | null> {
  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl, {
      fetch,
      lang: "es",
    });
    if (!transcript || transcript.length === 0) return null;
    return transcript.map((line) => ({
      text: line.text,
      offset: line.offset,
      duration: line.duration,
    }));
  } catch (e: any) {
    console.warn(`[Transcript] No se pudo obtener transcript para ${videoUrl}:`, e?.message || e);
    return null;
  }
}
```

- Se pasa `fetch` global del Worker como configuración (compatible con Cloudflare Workers).
- Se solicita el idioma `es` (español).
- Si falla, retorna `null` (no rompe el flujo).

### 15.3 Supabase — Columnas JSONB

**Archivo:** `supabase/migrations/20260803_oraciones_transcripts.sql`

```sql
ALTER TABLE public.oraciones_diarias
  ADD COLUMN IF NOT EXISTS laudes_transcript jsonb,
  ADD COLUMN IF NOT EXISTS visperas_transcript jsonb,
  ADD COLUMN IF NOT EXISTS completas_transcript jsonb;
```

### 15.4 Frontend — Componente `ElegantPrayerVideo`

**Archivo:** `src/components/ElegantPrayerVideo.tsx`

- Usa `react-youtube` en lugar de `<iframe>`.
- `cc_load_policy=0` fuerza a apagar los subtítulos nativos de YouTube.
- `requestAnimationFrame` sincroniza el tiempo del video con la UI.
- El transcript se muestra debajo del video con animación de lectura fluida:
  - Línea activa: `text-stone-900 scale-105 opacity-100 font-medium`
  - Líneas inactivas: `text-stone-400 opacity-60 scale-100`

### 15.5 Integración en `DailyPrayerPortal.tsx`

- `getYouTubeEmbedUrl()` ahora añade `cc_load_policy=0&controls=1`.
- Nueva función `getYouTubeVideoId()` extrae el ID del video.
- Si la parte de video tiene `transcript`, se renderiza `<ElegantPrayerVideo>`.
- Si no hay transcript, se mantiene el `<iframe>` como fallback.

---

## 16. Notas importantes

- **El canal es `Cathopray`** (channel_id `UCSgJ9Ppudkzs9cD259tjMQw`).
- **La clasificación es por título**: el video debe contener la palabra "laudes", "vísperas"/"visperas" o "completas" en el título.
- **Solo se toma el primer video** de cada categoría (el más reciente que coincida).
- **El video se inserta al inicio** de las partes de la hora, antes del contenido textual.
- **El embed usa `youtube-nocookie.com`** para privacidad.
- **La tabla `oraciones_diarias` es por fecha** — cada día tiene sus propios URLs.
- **El cron actualiza automáticamente** cada día a las 00:00 hora Caracas.
- **El admin puede sobrescribir manualmente** cualquier URL para cualquier fecha.
- **Los transcripts se extraen automáticamente** con `youtube-transcript` y se guardan como JSONB en Supabase.
- **Los subtítulos nativos de YouTube se ocultan** con `cc_load_policy=0`.
- **La sincronización usa `react-youtube`** (YouTube Iframe Player API) con `requestAnimationFrame`.
- **Si no hay transcript disponible**, se muestra el `<iframe>` tradicional como fallback.
