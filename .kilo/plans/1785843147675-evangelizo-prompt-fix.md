# Plan: Fix Gemini Liturgy Prompt with Evangelizo.org Data + Cache + Validation

## Objective
Prevent Gemini from hallucinating Gospel, Readings, Psalm, and Saint by using authoritative data from evangelizo.org, caching in Supabase, using XML-tagged prompts, and validating output. Priority: Cache → Evangelizo → Strict Validation → Nuclear Retry → Safe Fallback. Never return invented biblical text.

---

## 1. Supabase Schema: `liturgy_cache`

```sql
create table liturgy_cache (
  date_key text not null check (date_key ~ '^\d{8}$'),
  locale text not null default 'es',
  gospel text not null default '',
  first_reading text not null default '',
  psalm text not null default '',
  saint text not null default '',
  raw_source jsonb,
  source text check (source in ('cache', 'evangelizo', 'fallback')),
  confidence integer default 80,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (date_key, locale)
);

create index idx_liturgy_cache_locale on liturgy_cache(locale);
create index idx_liturgy_cache_created_at on liturgy_cache(created_at);

create trigger set_updated_at before update on liturgy_cache
  for each row execute function trigger_set_timestamp();
```

---

## 2. Helper: `getAuthoritativeLiturgy(env, targetDate, locale = 'es')` (near line 525)

```typescript
async function getAuthoritativeLiturgy(env: any, targetDate: string, locale: string = 'es') {
  const dateKey = targetDate.replace(/-/g, "");

  // 1. Cache-first
  let data = await fetchLiturgyCache(env, dateKey, locale);
  if (data) return { ...data, source: "cache", confidence: 95 };

  // 2. Fetch from Evangelizo with resilience
  try {
    data = await fetchEvangelizoWithTimeout(env, targetDate, locale);

    await supabaseUpsertLiturgyCache(env, {
      date_key: dateKey,
      locale,
      ...data,
      raw_source: data.raw,
      source: "evangelizo",
      confidence: 85,
    });

    return { ...data, source: "evangelizo", confidence: 85 };
  } catch (err) {
    console.error(`[Liturgy] Evangelizo failed for ${targetDate}:`, err);

    // 3. Last resort: try nearby cache (±1 day)
    const nearby = await fetchNearbyCache(env, dateKey, locale);
    if (nearby) {
      console.warn(`[Liturgy] Usando cache cercano para ${targetDate}`);
      return { ...nearby, source: "fallback", confidence: 40 };
    }

    throw new Error(`No se pudo obtener liturgia para ${targetDate}`);
  }
}
```

---

## 3. Helper: `fetchEvangelizoWithTimeout(env, targetDate, locale)` (near line 525)

```typescript
async function fetchEvangelizoWithTimeout(env: any, targetDate: string, locale: string = 'es') {
  const baseUrl = `http://feed.evangelizo.org/v2/reader.php?date=${targetDate}&lang=AM`;

  const fetchWithTimeout = (url: string, timeout = 8000) => {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Evangelizo timeout")), timeout)),
    ]);
  };

  const results = await Promise.allSettled([
    fetchWithTimeout(`${baseUrl}&type=reading&content=GSP`),
    fetchWithTimeout(`${baseUrl}&type=reading&content=FR`),
    fetchWithTimeout(`${baseUrl}&type=reading&content=PS`),
    fetchWithTimeout(`${baseUrl}&type=saint`),
  ]);

  const cleanHTML = (text: string) =>
    text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

  const gospel = results[0].status === "fulfilled" ? cleanHTML(await results[0].value.text()) : "";
  const firstReading = results[1].status === "fulfilled" ? cleanHTML(await results[1].value.text()) : "";
  const psalm = results[2].status === "fulfilled" ? cleanHTML(await results[2].value.text()) : "";
  const saint = results[3].status === "fulfilled" ? cleanHTML(await results[3].value.text()) : "";

  const raw = { gospel, firstReading, psalm, saint };

  // Validation: warn if critical texts are too short
  if (gospel.length < 50 || firstReading.length < 50) {
    console.warn("⚠️ Textos incompletos desde evangelizo.org para fecha:", targetDate);
  }

  return { gospel, firstReading, psalm, saint, raw };
}
```

---

## 4. Helpers: Cache CRUD

### `fetchLiturgyCache(env, dateKey, locale)`

```typescript
async function fetchLiturgyCache(env: any, dateKey: string, locale: string = 'es'): Promise<{
  gospel: string;
  firstReading: string;
  psalm: string;
  saint: string;
} | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/liturgy_cache?date_key=eq.${encodeURIComponent(dateKey)}&locale=eq.${encodeURIComponent(locale)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const row = data?.[0] || null;
  if (!row) return null;
  return {
    gospel: row.gospel || "",
    firstReading: row.first_reading || "",
    psalm: row.psalm || "",
    saint: row.saint || "",
  };
}
```

### `supabaseUpsertLiturgyCache(env, payload)`

```typescript
async function supabaseUpsertLiturgyCache(env: any, payload: any): Promise<void> {
  try {
    const url = `${env.SUPABASE_URL}/rest/v1/liturgy_cache`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[Cache] Upsert failed: ${res.status} ${text}`);
    }
  } catch (err) {
    console.error("[Cache] Upsert exception:", err);
  }
}
```

### `fetchNearbyCache(env, dateKey, locale)` (±1 day)

```typescript
async function fetchNearbyCache(env: any, dateKey: string, locale: string = 'es'): Promise<{
  gospel: string;
  firstReading: string;
  psalm: string;
  saint: string;
} | null> {
  const date = new Date(
    Number(dateKey.slice(0, 4)),
    Number(dateKey.slice(4, 6)) - 1,
    Number(dateKey.slice(6, 8))
  );

  const candidates = [
    new Date(date.getTime() - 86400000),
    new Date(date.getTime() + 86400000),
  ];

  for (const d of candidates) {
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const key = `${yyyy}${mm}${dd}`;
    const row = await fetchLiturgyCache(env, key, locale);
    if (row) return row;
  }
  return null;
}
```

### `escapeXml(str: string)`

```typescript
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
```

---

## 5. Modify `generateLiturgy` (line 932)

### 5a. Get authoritative data first

```typescript
const liturgyData = await getAuthoritativeLiturgy(env, target);
```

### 5b. Nuclear XML-tagged prompt

Replace current prompt with:

```typescript
const liturgyStructure = `
{
  "date": "${target}",
  "weekday": "",
  "season": "",
  "liturgicalColor": "",
  "liturgicalRank": "",
  "isSolemnity": false,
  "saint": {
    "name": "",
    "title": "",
    "initial": "",
    "story": "",
    "highlights": [],
    "lessons": [],
    "exampleToday": "",
    "gospelConnection": "",
    "venezuelaRelevance": "",
    "prayer": ""
  },
  "quote": { "text": "", "ref": "" },
  "gospel": { "ref": "", "title": "", "body": "", "evangelist": "" },
  "psalm": { "ref": "", "title": "", "body": "", "response": "" },
  "firstReading": { "ref": "", "title": "", "body": "" },
  "secondReading": null,
  "dailySpiritualPearl": {
    "source": "",
    "type": "quote",
    "speaker": "",
    "context": "",
    "date": "",
    "text": "",
    "reason": "",
    "theme": ""
  },
  "reflection": "",
  "catechism": { "number": "", "title": "", "text": "", "applyToday": "" },
  "imagePrompt": ""
}`;

const isFallback = liturgyData.source === "fallback";

let datosOficialesXML = "";

if (!isFallback) {
  datosOficialesXML = `
<DATOS_OFICIALES>
<EVANGELIO_OFICIAL_EXACTO>${escapeXml(liturgyData.gospel)}</EVANGELIO_OFICIAL_EXACTO>
<PRIMERA_LECTURA_OFICIAL_EXACTA>${escapeXml(liturgyData.firstReading)}</PRIMERA_LECTURA_OFICIAL_EXACTA>
<SALMO_OFICIAL_EXACTO>${escapeXml(liturgyData.psalm)}</SALMO_OFICIAL_EXACTO>
</DATOS_OFICIALES>

INSTRUCCIÓN: Copia estos textos EXACTOS en el JSON.
`;
} else {
  datosOficialesXML = `
<ALERTA_DE_SISTEMA>
No tenemos acceso a la base de datos litúrgica de hoy. 
Sin embargo, aquí tienes la liturgia que se celebró en una FECHA CERCANA (Ayer o Mañana):
</ALERTA_DE_SISTEMA>

<CONTEXTO_REFERENCIAL_FECHA_CERCANA>
- Evangelio cercano: ${liturgyData.gospel ? liturgyData.gospel.substring(0, 150) + "..." : "Desconocido"}
- Primera Lectura cercana: ${liturgyData.firstReading ? liturgyData.firstReading.substring(0, 150) + "..." : "Desconocido"}
- Santo cercano: ${liturgyData.saint || "Desconocido"}
</CONTEXTO_REFERENCIAL_FECHA_CERCANA>

INSTRUCCIÓN CRÍTICA DE DEDUCCIÓN: 
1. NO copies los textos de arriba, corresponden a otro día.
2. Usa ese contexto referencial para calcular matemáticamente qué semana del Tiempo Litúrgico es HOY (${target}).
3. Siguiendo la "Lectio Continua" del Leccionario Católico, deduce cuál es el Evangelio y la Primera Lectura exacta que corresponde al día de HOY.
4. Busca en tu memoria los textos completos de HOY y genera el JSON.
`;
}

const prompt = `Eres un liturgista católico estricto y preciso para la aplicación "Camino" en Venezuela.

<REGLAS_INQUEBRANTABLES>
- Debes usar literal y exactamente el texto dentro de las etiquetas <TEXTO_OFICIAL>.
- No puedes parafrasear, resumir, ni cambiar ni una coma de los textos bíblicos.
- Si el texto dice "NO DISPONIBLE", deja ese campo vacío o con el texto oficial tal cual.
- Solo puedes responder con un JSON válido. Nada de texto antes o después.
- Temperatura = 0.0 (máxima precisión).
</REGLAS_INQUEBRANTABLES>

${datosOficialesXML}

Fuente: ${liturgyData.source} | Confianza: ${liturgyData.confidence}/100 | Fecha: ${target}

Genera ÚNICAMENTE el siguiente JSON:

${liturgyStructure}
`;
```

Keep all existing rules for dailySpiritualPearl, reflection, catechism, imagePrompt, etc. within the prompt after the schema.

---

## 6. Post-Generation Validation

```typescript
function validateTextSimilarity(official: string, generated: string): boolean {
  if (!official || official.length < 30) return true;

  const normalize = (s: string) =>
    s.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[.,;:«»"']/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const officialNorm = normalize(official);
  const generatedNorm = normalize(generated || "");

  const substring = officialNorm.substring(0, 60);
  return generatedNorm.includes(substring);
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&hellip;/g, "...")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–");
}

let parsed: any;
try {
  parsed = parseJsonWithRepair(text);
} catch (e) {
  console.warn("JSON parse failed, using default liturgy:", e);
  return getDefaultLiturgy(target);
}

// Strict validation: check gospel, firstReading, psalm against official source
const gospelValid = validateTextSimilarity(liturgyData.gospel, parsed.gospel?.body);
const readingValid = validateTextSimilarity(liturgyData.firstReading, parsed.firstReading?.body);
const psalmValid = validateTextSimilarity(liturgyData.psalm, parsed.psalm?.body);

if (!gospelValid || !readingValid || !psalmValid) {
  console.error("❌ ALUCINACIÓN DETECTADA en:", {
    gospel: !gospelValid,
    reading: !readingValid,
    psalm: !psalmValid,
  });

  // Nuclear retry once with stricter prompt
  const strictPrompt = `ATENCIÓN: En el intento anterior NO copiaste exactamente el texto oficial. Esta es tu ÚLTIMA OPORTUNIDAD.

<EVANGELIO_OFICIAL_EXACTO>
${escapeXml(liturgyData.gospel)}
</EVANGELIO_OFICIAL_EXACTO>

<PRIMERA_LECTURA_OFICIAL_EXACTA>
${escapeXml(liturgyData.firstReading)}
</PRIMERA_LECTURA_OFICIAL_EXACTA>

<SALMO_OFICIAL_EXACTO>
${escapeXml(liturgyData.psalm)}
</SALMO_OFICIAL_EXACTO>

Copia estos textos CARÁCTER POR CARÁCTER en los campos correspondientes del JSON. No parafrasees.`;

  const retryRes = await generateWithProviderFallback(
    (model, apiKey) =>
      fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: strictPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0,
            maxOutputTokens: 8192,
          },
        }),
      }),
    (model, env) =>
      vertexAiGenerateContent(model, env, {
        contents: [{ parts: [{ text: strictPrompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0,
          maxOutputTokens: 8192,
        },
      }),
    env
  );

  const retryData = await retryRes.json();
  const retryText = retryData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const retryParsed = parseJsonWithRepair(retryText);

  const retryGospelValid = validateTextSimilarity(liturgyData.gospel, retryParsed.gospel?.body);
  const retryReadingValid = validateTextSimilarity(liturgyData.firstReading, retryParsed.firstReading?.body);
  const retryPsalmValid = validateTextSimilarity(liturgyData.psalm, retryParsed.psalm?.body);

  if (retryGospelValid && retryReadingValid && retryPsalmValid) {
    parsed = retryParsed;
  } else {
    // Second failure: force ALL official texts with HTML entity cleanup
    parsed.gospel = {
      ref: parsed.gospel?.ref || "",
      title: parsed.gospel?.title || "",
      body: decodeHTMLEntities(liturgyData.gospel),
      evangelist: parsed.gospel?.evangelist || "",
    };
    parsed.firstReading = {
      ref: parsed.firstReading?.ref || "",
      title: parsed.firstReading?.title || "",
      body: decodeHTMLEntities(liturgyData.firstReading),
    };
    parsed.psalm = {
      ref: parsed.psalm?.ref || "",
      title: parsed.psalm?.title || "",
      body: decodeHTMLEntities(liturgyData.psalm),
      response: parsed.psalm?.response || "",
    };
  }
}
```

---

## 7. Fallback Strategy Summary

| Step | Action | Confidence |
|---|---|---|
| 1 | Check `liturgy_cache` for target date + locale | 95% |
| 2 | If miss: `Promise.allSettled` + timeout fetch from evangelizo | 85% |
| 3 | Clean HTML, validate length, upsert to `liturgy_cache` | — |
| 4 | Build XML-tagged prompt, call Gemini with temperature 0 | — |
| 5 | Parse JSON, validate gospel/reading/psalm against source text | — |
| 6 | If hallucination: nuclear retry with strict prompt | — |
| 7 | If retry fails: force official gospel text, keep rest of JSON | — |
| 8 | If everything fails: use nearby cache (±1 day) or `getDefaultLiturgy(target)` | 40% |

---

## 8. Files/Lines to Modify

- `D:\documentos\camino\worker\src\index.ts`
  - Add `escapeXml` near line 525
  - Add `fetchLiturgyCache` near line 525
  - Add `supabaseUpsertLiturgyCache` near existing `supabaseUpsert` (line 553)
  - Add `fetchNearbyCache` near line 525
  - Add `fetchEvangelizoWithTimeout` near line 525
  - Add `getAuthoritativeLiturgy` near line 525
  - Add `validateTextSimilarity` near line 525
  - Modify `generateLiturgy` starting at line 932:
    - Use cache-first + evangelizo fetch via `getAuthoritativeLiturgy`
    - Replace prompt with XML-tagged nuclear prompt
    - Add post-generation validation + nuclear retry
  - Ensure `generateLiturgy` still exports/called correctly by `cachedOrGenerate`

---

## 9. Validation

- Confirm `generateLiturgy` compiles
- Confirm no existing exports/imports are broken
- Verify Supabase table `liturgy_cache` is created before deploying
- Verify XML prompt injection is well-formed
- Verify validation logic handles empty strings safely
- Verify `Promise.allSettled` + timeout prevents worker hangs
