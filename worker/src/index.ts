import webpush from "web-push";

// ==========================================
// Camino API Worker - Resilient AI Fallback + JSON Repair
// Compatible con Gemini Interactions API (2026)
// ==========================================

let vapidConfigured = false;

/**
 * Cadena de respaldo infalible con modelos GA vigentes en 2026.
 * Todos los modelos 1.0, 1.5 y 2.0 fueron dados de baja (HTTP 404).
 */
const MODEL_FALLBACK_CHAIN = [
  "gemini-3.5-flash",       // 1er intento: GA 2026 - Mejor balance inteligencia/velocidad
  "gemini-3.5-flash-lite",  // 2do intento: GA 2026 - Ultrarrápido y alta disponibilidad
  "gemini-3.1-flash-lite",  // 3er intento: Respaldo estable GA
  "gemini-2.5-flash",       // 4to intento: Respaldo estable de generación anterior
];

const MAX_RETRIES_PER_MODEL = 3;
const BASE_RETRY_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Configuración de VAPID para web-push de manera segura.
 */
export function ensureVapidConfigured(
  subject: string,
  publicKey: string,
  privateKey: string
): void {
  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
}

/**
 * Utilidad de reparación de JSON resistente ante salidas imprecisas del modelo.
 * Elimina bloques Markdown, comas finales inválidas y extrae el objeto JSON.
 */
export function repairJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("Texto vacío o inválido para procesar como JSON.");
  }

  let cleaned = rawText.trim();

  // 1. Remover bloques de código Markdown (```json ... ```)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  // 2. Extraer bloque entre el primer '{' o '[' y el último '}' o ']'
  const firstBrace = cleaned.search(/[\{\[]/);
  const lastBrace = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 3. Intento de parseo directo
  try {
    return JSON.parse(cleaned);
  } catch (initialError) {
    // 4. Reparaciones comunes de JSON mal formado
    // Eliminar comas flotantes antes de cerrar objetos/arreglos: {,} o [,]
    cleaned = cleaned.replace(/,\s*([\}\]])/g, "$1");

    try {
      return JSON.parse(cleaned);
    } catch (finalError) {
      throw new Error(
        `Fallo al reparar y parsear JSON del modelo: ${(finalError as Error).message}\nTexto original limpiado: ${cleaned}`
      );
    }
  }
}

/**
 * Interfaz para la respuesta de la Interactions API de Gemini v1beta
 */
interface InteractionResponse {
  id?: string;
  output_text?: string;
  steps?: Array<{
    content?: {
      text?: string;
    };
    [key: string]: any;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Llama a la nueva Interactions API de Gemini con fallback en cadena y reintentos automáticos.
 * 
 * Endpoint actual (2026): POST https://generativelanguage.googleapis.com/v1beta/interactions
 */
export async function generateContentResilient(
  prompt: string,
  apiKey: string,
  options: {
    systemInstruction?: string;
    requireJson?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<string> {
  const errorsLog: string[] = [];

  for (const model of MODEL_FALLBACK_CHAIN) {
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = options.timeoutMs
          ? setTimeout(() => controller.abort(), options.timeoutMs)
          : null;

        // Estructura para la nueva Interactions API (/v1beta/interactions)
        // También compatible si se especifica el modelo en el cuerpo
        const requestBody: Record<string, any> = {
          model: `models/${model}`,
          input: prompt,
          // La API Interactions gestiona el estado por defecto; store: false para llamadas stateless tipo Worker
          store: false,
        };

        if (options.systemInstruction) {
          requestBody.system_instruction = options.systemInstruction;
        }

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/interactions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
          }
        );

        if (timeoutId) clearTimeout(timeoutId);

        const data = (await response.json()) as InteractionResponse;

        if (!response.ok || data.error) {
          const errMsg = data.error?.message || response.statusText || `HTTP ${response.status}`;
          throw new Error(`[${model}] HTTP ${response.status}: ${errMsg}`);
        }

        // Extraer texto de la respuesta en formato Interactions API
        let outputText = data.output_text;
        if (!outputText && data.steps && data.steps.length > 0) {
          outputText = data.steps
            .map((step) => step.content?.text || "")
            .join("")
            .trim();
        }

        if (!outputText) {
          throw new Error(`[${model}] Respuesta vacía de la API Interactions.`);
        }

        return outputText;
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        errorsLog.push(`Model: ${model} | Intento: ${attempt}/${MAX_RETRIES_PER_MODEL} | Error: ${errorMsg}`);

        // Si el error es 404 (modelo no disponible/retirado), saltar directamente al siguiente modelo
        if (errorMsg.includes("404") || errorMsg.includes("NOT_FOUND") || errorMsg.includes("no longer available")) {
          break;
        }

        // Si no es el último intento de este modelo, aplicar backoff exponencial
        if (attempt < MAX_RETRIES_PER_MODEL) {
          const delay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
        }
      }
    }
  }

  // Si todos los modelos de la cadena fallaron
  throw new Error(
    `Todos los proveedores de IA fallaron (Error 500/Fallback agotado).\nHistorial de errores:\n${errorsLog.join("\n")}`
  );
}

/**
 * Helper listo para usar: Genera salida JSON validada y autorreparada.
 */
export async function generateJsonResilient<T = any>(
  prompt: string,
  apiKey: string,
  systemInstruction?: string
): Promise<T> {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY a valid JSON object without markdown formatting or extra commentary.`;
  const rawText = await generateContentResilient(jsonPrompt, apiKey, {
    systemInstruction,
    requireJson: true,
  });
  return repairJson<T>(rawText);
}

// ===== Vertex AI support =====
const VERTEX_MODEL_MAP: Record<string, string> = {
  "gemini-3.5-flash": "gemini-3.5-flash-001",
  "gemini-3.5-flash-lite": "gemini-3.5-flash-lite-001",
  "gemini-3.1-flash-lite": "gemini-3.1-flash-lite-001",
  "gemini-2.5-flash": "gemini-2.5-flash-001",
};

function mapModelToVertex(model: string): string {
  return VERTEX_MODEL_MAP[model] || model;
}

let vertexTokenCache: { token: string; expiresAt: number } | null = null;

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signJwtAssertion(data: string, privateKeyPem: string): Promise<string> {
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s+/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(data)
  );

  const sigBytes = new Uint8Array(signature);
  let sigBinary = "";
  for (let i = 0; i < sigBytes.length; i++) {
    sigBinary += String.fromCharCode(sigBytes[i]);
  }
  return base64UrlEncode(sigBinary);
}

async function getVertexAccessToken(env: any): Promise<string> {
  const now = Date.now();
  if (vertexTokenCache && vertexTokenCache.expiresAt > now + 60000) {
    return vertexTokenCache.token;
  }

  const sa = JSON.parse(env.VERTEX_SERVICE_ACCOUNT_JSON);
  const tokenUri = sa.token_uri || "https://oauth2.googleapis.com/token";
  const clientEmail = sa.client_email;
  const privateKey = sa.private_key;

  const header = { alg: "RS256", typ: "JWT" };
  const iat = Math.floor(now / 1000);
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: tokenUri,
    exp: iat + 3600,
    iat: iat,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const assertion = `${encodedHeader}.${encodedPayload}`;

  const signature = await signJwtAssertion(assertion, privateKey);
  const jwt = `${assertion}.${signature}`;

  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vertex token exchange failed: ${res.status} ${text}`);
  }

  const tokenData = await res.json() as any;
  vertexTokenCache = {
    token: tokenData.access_token,
    expiresAt: now + (tokenData.expires_in || 3600) * 1000,
  };

  return tokenData.access_token;
}

async function vertexAiGenerateContent(model: string, env: any, body: any): Promise<Response> {
  const accessToken = await getVertexAccessToken(env);
  const vertexModel = mapModelToVertex(model);
  const projectId = env.VERTEX_PROJECT_ID;
  const region = env.VERTEX_REGION || "us-central1";

  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${vertexModel}:generateContent`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

async function vertexAiPredict(model: string, env: any, body: any): Promise<Response> {
  const accessToken = await getVertexAccessToken(env);
  const vertexModel = mapModelToVertex(model);
  const projectId = env.VERTEX_PROJECT_ID;
  const region = env.VERTEX_REGION || "us-central1";

  const url = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${vertexModel}:predict`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
}

// ===== End Vertex AI support =====

/**
 * Provider-aware fallback: Gemini (AI Studio) uses API key + generativelanguage.googleapis.com.
 * Vertex AI uses OAuth2 service account + aiplatform.googleapis.com.
 */
async function generateWithProviderFallback(
  geminiCallFn: (model: string, apiKey: string) => Promise<Response>,
  vertexCallFn: (model: string, env: any) => Promise<Response>,
  env: any
): Promise<Response> {
  const providers: {
    name: string;
    enabled: boolean;
    call: (model: string) => Promise<Response>;
  }[] = [];

  // Gemini (AI Studio) — primary
  if (env.GEMINI_API_KEY) {
    providers.push({
      name: "AI Studio (Gemini)",
      enabled: true,
      call: (model: string) => geminiCallFn(model, env.GEMINI_API_KEY),
    });
  } else {
    console.warn("[AI Provider] AI Studio (Gemini) no configurado, continuando...");
  }

  // Vertex AI — fallback
  if (env.VERTEX_SERVICE_ACCOUNT_JSON && env.VERTEX_PROJECT_ID) {
    providers.push({
      name: "Vertex AI",
      enabled: true,
      call: (model: string) => vertexCallFn(model, env),
    });
  } else {
    console.warn("[AI Provider] Vertex AI no configurado (falta VERTEX_SERVICE_ACCOUNT_JSON o VERTEX_PROJECT_ID), continuando...");
  }

  if (providers.length === 0) {
    throw new Error("No AI providers configured. Set GEMINI_API_KEY or VERTEX_SERVICE_ACCOUNT_JSON + VERTEX_PROJECT_ID.");
  }

  let lastError: unknown = null;

  for (const provider of providers) {
    console.log(`[AI Provider] Probando ${provider.name}...`);

    try {
      const result = await generateWithFallback(async (model) => {
        const res = await provider.call(model);
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[AI Provider] ${provider.name} model=${model} error:`, errorText);
          throw new Error(
            `HTTP Error ${res.status} - ${res.statusText}: ${errorText}`
          );
        }
        return res;
      });
      console.log(`[AI Provider] ${provider.name} respondió correctamente.`);
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(
        `[AI Provider] ${provider.name} falló:`,
        error?.message || error
      );
    }

    console.warn(`[AI Provider] ${provider.name} agotó sus reintentos. Pasando al siguiente proveedor...`);
  }

  throw new Error(
    `All AI providers failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

async function generateWithFallback<T>(
  apiCallFn: (model: string) => Promise<T>,
  maxRetriesPerModel: number = MAX_RETRIES_PER_MODEL
): Promise<T> {
  let lastError: unknown = null;

  for (const model of MODEL_FALLBACK_CHAIN) {
    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      try {
        return await apiCallFn(model);
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        const isTransientError =
          errorMessage.includes("503") ||
          errorMessage.includes("429") ||
          errorMessage.includes("UNAVAILABLE") ||
          errorMessage.includes("RESOURCE_EXHAUSTED");

        console.warn(
          `[AI Fallback] ${model} failed (attempt ${attempt}/${maxRetriesPerModel}):`,
          errorMessage
        );

        if (isTransientError && attempt < maxRetriesPerModel) {
          const backoffDelay = Math.pow(2, attempt) * 1000;
          console.log(`[AI Fallback] Retrying ${model} in ${backoffDelay}ms...`);
          await sleep(backoffDelay);
        } else {
          break;
        }
      }
    }

    console.warn(`[AI Fallback] Moving to next model in fallback chain...`);
  }

  throw new Error(
    `All models in fallback chain failed. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

function parseJsonWithRepair(text: string): any {
  const strategies = [
    () => JSON.parse(text),
    () => JSON.parse(repairJson(text)),
    () => {
      const cleaned = text
        .replace(/```json\s*/i, "")
        .replace(/```/g, "")
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/('(?:[^'\\]|\\.)*')/g, '"$1"')
        .replace(/\/\/[^\n]*/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      return JSON.parse(cleaned);
    },
  ];
  for (const strategy of strategies) {
    try {
      return strategy();
    } catch {
      continue;
    }
  }
  throw new Error("Failed to parse JSON after all repair attempts");
}

function configureVapid(env: any) {
  if (vapidConfigured) return;
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    console.warn("VAPID keys not configured in worker environment");
    return;
  }
  webpush.setVapidDetails(
    "mailto:admin@camino.app",
    publicKey,
    privateKey,
  );
  vapidConfigured = true;
}

function caracasDate(iso?: string | Date): string {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function getTodayKey(): string {
  return caracasDate();
}

function handleVapidKey(_request: Request, env: any): Response {
  return jsonResponse({ vapidPublicKey: env.VAPID_PUBLIC_KEY || "" });
}

async function supabaseSelect(env: any, table: string, params: Record<string, string> = {}, body: any = null): Promise<any> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) qs.set(k, v);
  const url = `${env.SUPABASE_URL}/rest/v1/${table}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      Prefer: body ? "return=representation" : "",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${table} select failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function supabaseUpsert(env: any, table: string, row: any): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${table} upsert failed: ${res.status} ${text}`);
  }
}

async function supabaseFetchDaily(env: any, date: string): Promise<any> {
  const url = `${env.SUPABASE_URL}/rest/v1/daily_liturgy?date=eq.${encodeURIComponent(date)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const row = data[0] || null;
  if (!row) return null;
  const out: Record<string, any> = { ...row };
  for (const key of Object.keys(row)) {
    const camel = key
      .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      .replace(/^([A-Z])/, (c) => c.toLowerCase());
    if (camel !== key) {
      out[camel] = row[key];
      delete out[key];
    }
  }
  return out;
}

async function supabaseUpsertDaily(env: any, date: string, liturgy: any): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/daily_liturgy`;
  const body: Record<string, any> = {
    date,
    weekday: liturgy.weekday,
    season: liturgy.season,
    liturgical_color: liturgy.liturgicalColor,
    is_solemnity: liturgy.isSolemnity ?? false,
    saint: liturgy.saint ?? null,
    quote: liturgy.quote,
    gospel: liturgy.gospel,
    psalm: liturgy.psalm,
    first_reading: liturgy.firstReading ?? liturgy.first_reading ?? null,
    second_reading: liturgy.secondReading ?? liturgy.second_reading ?? null,
    laudes: liturgy.laudes ?? { title: "Laudes", hour: "07:00", mood: "dawn", parts: [] },
    vespers: liturgy.vespers ?? { title: "Vísperas", hour: "18:00", mood: "dusk", parts: [] },
    compline: liturgy.compline ?? { title: "Completas", hour: "21:00", mood: "night", parts: [] },
    angelus: liturgy.angelus ?? null,
    catechism: liturgy.catechism ?? null,
    reflection: liturgy.reflection,
    image_url: liturgy.imageUrl ?? liturgy.image_url ?? null,
    messages: liturgy.messages && liturgy.messages.length > 0 ? liturgy.messages : (liturgy.marian ? [liturgy.marian] : null),
    generated_at: new Date().toISOString(),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase upsert failed: ${res.status} ${text}`);
  }
}

const YOUTUBE_RSS_URL = "https://www.youtube.com/feeds/videos.xml?channel_id=UCSgJ9Ppudkzs9cD259tjMQw";

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

async function supabaseFetchOraciones(env: any, date: string): Promise<{ laudes?: string; visperas?: string; completas?: string } | null> {
  const url = `${env.SUPABASE_URL}/rest/v1/oraciones_diarias?fecha=eq.${encodeURIComponent(date)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    },
  });
  if (!res.ok) {
    if (res.status === 404) {
      // Table may not exist yet
      return null;
    }
    const text = await res.text();
    throw new Error(`Supabase oraciones_diarias fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data?.[0] || null;
}

async function supabaseUpsertOraciones(env: any, date: string, oraciones: { laudes?: string; visperas?: string; completas?: string }): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/oraciones_diarias`;
  const body: Record<string, any> = {
    fecha: date,
    laudes: oraciones.laudes ?? null,
    visperas: oraciones.visperas ?? null,
    completas: oraciones.completas ?? null,
    updated_at: new Date().toISOString(),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase oraciones_diarias upsert failed: ${res.status} ${text}`);
  }
}

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

async function generateLiturgy(env: any, targetDate?: string): Promise<any> {
  const target = targetDate || getTodayKey();

  let previousSource = "";
  try {
    const yesterday = caracasDate(new Date(Date.now() - 86400000));
    const prevLiturgy = await supabaseFetchDaily(env, yesterday);
    if (prevLiturgy?.marian?.source) {
      previousSource = prevLiturgy.marian.source;
    }
  } catch (e) {
    console.warn("No se pudo obtener la liturgia anterior para el filtro de variedad:", e);
  }

const prompt = `Eres un asistente litúrgico, teólogo y catequista católico experto para la aplicación "Camino" en Venezuela.
Genera el contenido litúrgico completo y coherente para la fecha: ${target}.
Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown, sin bloques \`\`\`json).

REGLAS ESTRICTAS DE GENERACIÓN (¡IMPORTANTE!):
1. EL SANTO DEL DÍA ES OBLIGATORIO: Incluso si el rango litúrgico es "feria", debes buscar el santo de memoria libre o del martirologio romano correspondiente a esta fecha. El objeto "saint" NO PUEDE SER NULL bajo ninguna circunstancia.
2. TEXTOS BÍBLICOS COMPLETOS: No dejes los campos "body" del Evangelio, Salmo o Primera Lectura vacíos (""). Escribe el texto bíblico completo correspondiente a la fecha.
3. LONGITUD: Mantén la historia del santo ("story") concisa, máximo 150 palabras para garantizar la correcta formación del JSON.

CONTEXTO DE FUENTES MARIANAS Y SANTO DEL DÍA:
Fuentes permitidas para el mensaje diario:
1. Virgen de Betania (Venezuela)
2. Mensajes de Medjugorje (selección pastoral)
3. Apariciones de Fátima
4. Mensajes de Lourdes
5. Virgen de Coromoto (Venezuela)
6. San José Gregorio Hernández
7. Santa Madre Carmen Rendiles
8. Beata María de San José
9. Magisterio: Papa Francisco, Benedicto XVI, San Juan Pablo II o Vaticano.

REGLA DE FUENTE ANTERIOR: La fuente utilizada ayer fue "${previousSource || 'Ninguna'}". NO repitas esta misma fuente hoy a menos que sea estrictamente necesario por solemnidad.

PROCESO DE GENERACIÓN E INTEGRACIÓN:
1. Identifica el Evangelio y Santo correspondiente a la fecha ${target}.
2. Evalúa cuál de las Fuentes Permitidas guarda la mayor relación temática, litúrgica o espiritual con el Evangelio de hoy.
3. REFLEXIÓN GENERAL (EL CORAZÓN DEL MENSAJE): Escribe el campo "reflection" asumiendo la voz viva, amorosa y cercana del mismísimo Jesucristo hablándole directamente al corazón del creyente venezolano. Actúa como un escritor humano, empático y cercano. Escribe con calidez, alma y corazón, usando un tono conversacional, honesto y reflexivo. Conecta de forma natural: El mensaje de mi Evangelio de hoy + La realidad de lucha, esperanza y fe en Venezuela + La enseñanza de la fuente seleccionada. PROHIBIDO usar frases cliché de inteligencia artificial, listas, o formalidades exageradas. Haz que el lector sienta mi abrazo consolador, mi paz y mi presencia a su lado.
4. Genera Lecturas completas y Catecismo (CEC real directamente relacionado con el Evangelio del día).
5. Nota: Laudes, Vísperas, Completas y Ángelus NO se generan aquí, han sido excluidos del modelo.

Estructura JSON requerida:
{
  "date": "${target}",
  "weekday": "día de la semana",
  "season": "tiempo liturgico",
  "liturgicalColor": "color litúrgico",
  "liturgicalRank": "solemnidad|fiesta|memoria|feria",
  "isSolemnity": false,
  "saint": {
    "name": "nombre del santo",
    "title": "título",
    "initial": "inicial",
    "story": "historia resumida (100-150 palabras)",
    "highlights": ["hito1", "hito2"],
    "lessons": ["lección1", "lección2"],
    "exampleToday": "ejemplo práctico para hoy",
    "gospelConnection": "relación directa con el evangelio de hoy",
    "venezuelaRelevance": "relevancia espiritual para Venezuela",
    "prayer": "oración de intercesión"
  },
  "quote": { "text": "cita bíblica o de un padre de la iglesia", "ref": "referencia" },
  "gospel": { "ref": "referencia", "title": "título", "body": "texto completo del evangelio", "evangelist": "nombre del evangelista" },
  "psalm": { "ref": "referencia", "title": "título", "body": "texto completo del salmo con respuestas" },
  "firstReading": { "ref": "referencia", "title": "título", "body": "texto completo" },
  "secondReading": null,
  "marian": {
    "source": "Nombre exacto de la fuente elegida de la lista",
    "reason": "Explicación breve de por qué se conectó con el evangelio de hoy",
    "text": "Mensaje o reflexión mariana/vocacional (max 100 palabras)",
    "relevant": true
  },
  "reflection": "Mensaje escrito en primera persona por Jesús, lleno de amor, hablando directo al corazón del venezolano.",
  "catechism": { "number": "Número CEC temáticamente ligado al Evangelio", "title": "Título", "text": "Texto doctrinal", "applyToday": "Aplicación" },
  "imagePrompt": "Descripción artística en inglés para generar una imagen sacra de alta calidad"
}`;

const liturgySchema = {
  type: "OBJECT",
  properties: {
    date: { type: "STRING" },
    weekday: { type: "STRING" },
    season: { type: "STRING" },
    liturgicalColor: { type: "STRING" },
    liturgicalRank: { type: "STRING" },
    isSolemnity: { type: "BOOLEAN" },
    saint: {
      type: "OBJECT",
      properties: {
        name: { type: "STRING" },
        title: { type: "STRING" },
        initial: { type: "STRING" },
        story: { type: "STRING" },
        highlights: { type: "ARRAY", items: { type: "STRING" } },
        lessons: { type: "ARRAY", items: { type: "STRING" } },
        exampleToday: { type: "STRING" },
        gospelConnection: { type: "STRING" },
        venezuelaRelevance: { type: "STRING" },
        prayer: { type: "STRING" },
      },
      required: ["name", "title", "story", "gospelConnection", "prayer"],
    },
    quote: {
      type: "OBJECT",
      properties: {
        text: { type: "STRING" },
        ref: { type: "STRING" },
      },
      required: ["text", "ref"],
    },
    gospel: {
      type: "OBJECT",
      properties: {
        ref: { type: "STRING" },
        title: { type: "STRING" },
        body: { type: "STRING" },
        evangelist: { type: "STRING" },
      },
      required: ["ref", "title", "body", "evangelist"],
    },
    psalm: {
      type: "OBJECT",
      properties: {
        ref: { type: "STRING" },
        title: { type: "STRING" },
        body: { type: "STRING" },
        response: { type: "STRING" },
      },
      required: ["ref", "title", "body", "response"],
    },
    firstReading: {
      type: "OBJECT",
      properties: {
        ref: { type: "STRING" },
        title: { type: "STRING" },
        body: { type: "STRING" },
      },
      required: ["ref", "title", "body"],
    },
    secondReading: {
      type: "OBJECT",
      properties: {
        ref: { type: "STRING" },
        title: { type: "STRING" },
        body: { type: "STRING" },
      },
    },
    marian: {
      type: "OBJECT",
      properties: {
        source: { type: "STRING" },
        text: { type: "STRING" },
        relevant: { type: "BOOLEAN" },
        reason: { type: "STRING" },
      },
      required: ["source", "text", "relevant", "reason"],
    },
    reflection: { type: "STRING" },
    catechism: {
      type: "OBJECT",
      properties: {
        number: { type: "STRING" },
        title: { type: "STRING" },
        text: { type: "STRING" },
        applyToday: { type: "STRING" },
      },
      required: ["number", "title", "text", "applyToday"],
    },
    imagePrompt: { type: "STRING" },
  },
  required: [
    "date",
    "weekday",
    "season",
    "liturgicalColor",
    "liturgicalRank",
    "isSolemnity",
    "saint",
    "quote",
    "gospel",
    "psalm",
    "firstReading",
    "marian",
    "reflection",
    "catechism",
    "imagePrompt",
  ],
};
  const res = await generateWithProviderFallback(
    // Gemini call (AI Studio)
    (model, apiKey) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              responseSchema: liturgySchema,
              temperature: 0.2,
              maxOutputTokens: 8192,
            },
          }),
        }
      ),
    // Vertex AI call
    (model, env) =>
      vertexAiGenerateContent(model, env, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: liturgySchema,
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    env
  );

  const data = await res.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  text = text.replace(/^```(?:json)?\s*[\r\n]/i, "").replace(/[\r\n]*```$/, "").trim();

  let parsed: any;
  try {
    parsed = parseJsonWithRepair(text);
  } catch (e) {
    console.warn("JSON parse failed, using default liturgy:", e);
    return getDefaultLiturgy(target);
  }

  parsed.date = target;

  if (!parsed.catechism || typeof parsed.catechism !== "object") {
    parsed.catechism = publicDomainCatechism(target);
  }

  if (!parsed.messages || !Array.isArray(parsed.messages) || parsed.messages.length === 0) {
    parsed.messages = [
      {
        source: "San José Gregorio Hernández",
        text: `Dios te invita hoy a vivir el evangelio con mayor entrega. En ${target || 'este día'}, confía en la Providencia como lo hizo el Padre de los Pobres.`,
        relevant: true,
      },
    ];
  }
  if (!parsed.marian || !parsed.marian.text) {
    parsed.marian = parsed.messages[0];
  }
  if (!parsed.saint || typeof parsed.saint !== "object" || !parsed.saint.name) {
    parsed.saint = {
      name: "San José Gregorio Hernández",
      title: "Padre de los Pobres",
      story: "Modelo de caridad y entrega.",
      highlights: [],
      lessons: [],
      gospelConnection: "Entrega y misericordia.",
      venezuelaRelevance: "Patrono de Venezuela.",
      prayer: "Intercede por nosotros.",
    };
  }

  if (
    parsed.marian?.source === "San Jose Gregorio Hernandez" ||
    parsed.marian?.source === "San Jose Gregorio"
  ) {
    parsed.marian.source = "San José Gregorio Hernández";
  }
  parsed.messages = parsed.messages.map((m: any) => {
    if (m.source === "San Jose Gregorio Hernandez" || m.source === "San Jose Gregorio") {
      return { ...m, source: "San José Gregorio Hernández" };
    }
    return m;
  });

  return parsed;
}

const PUBLIC_DOMAIN_CATECHISM: Record<string, { number: string; title: string; text: string; applyToday: string }> = {
  default: {
    number: "169",
    title: "La oración cristiana",
    text: "La oración es la elevación del alma a Dios. Es un don de Dios y una respuesta del hombre. En la oración, el hombre se dirige a Dios para adorarlo, pedirle perdón, darle gracias y pedirle sus dones. La oración cristiana es una relación personal con Dios en Cristo Jesús, por la cual el Espíritu Santo nos hace participar en la filiación divina de Jesús.",
    applyToday: "Hoy dedica 10 minutos a orar con tus propias palabras. Habla con Dios como un amigo: agradécele, pídele perdón y encomiéndale tu día.",
  },
};

function publicDomainCatechism(date: string): { number: string; title: string; text: string; applyToday: string } {
  const key = date || "default";
  return PUBLIC_DOMAIN_CATECHISM[key] ?? PUBLIC_DOMAIN_CATECHISM.default;
}

function getDefaultLaudes(): any {
  return {
    title: "Laudes del día",
    hour: "07:00",
    mood: "dawn",
    body: "Señor, abre mis labios, y mi boca proclamará tu alabanza.",
    parts: [
      { kind: "invitatory", label: "Invitatorio", text: "Ven, Espíritu Santo, ven por medio de la poderosa intercesión del Inmaculado Corazón de María." },
      { kind: "hymn", label: "Himno", text: "Cantemos al Señor con alegría, celebremos su amor infinito." },
      { kind: "psalmody", label: "Salmo 1", text: "Bendito seas, Señor, Dios de nuestros padres, por siempre bendito.", response: "Te alabamos, Señor." },
      { kind: "psalmody", label: "Salmo 2", text: "El Señor es mi pastor, nada me falta. En pastos verdes me hace reposar.", response: "Te alabamos, Señor." },
      { kind: "reading", label: "Lectura breve", text: "Lectura breve del día según la liturgia.", rubric: "Leer en silencio y meditar." },
      { kind: "gospelCanticle", label: "Cántico evangélico", text: "Bendito sea el Señor, Dios de Israel, porque ha visitado a su pueblo.", response: "Te alabamos, Señor." },
      { kind: "intercessions", label: "Preces", text: "Oremos por la Iglesia, por Venezuela, por nuestros seres queridos.", response: "Te rogamos, Señor." },
      { kind: "concludingPrayer", label: "Oración conclusiva", text: "Señor, te ofrecemos este día con todo lo que somos. Amén." },
    ],
  };
}

function getDefaultVespers(): any {
  return {
    title: "Vísperas del día",
    hour: "18:00",
    mood: "dusk",
    body: "Dios mío, ven en mi auxilio.",
    parts: [
      { kind: "hymn", label: "Himno", text: "Cantemos la alabanza del Señor que nos ha salvado." },
      { kind: "psalmody", label: "Salmo 1", text: "El Señor es mi luz y mi salvación, ¿a quién temeré?", response: "Te alabamos, Señor." },
      { kind: "psalmody", label: "Salmo 2", text: "Bendito el que viene en nombre del Señor. Hosanna en el cielo.", response: "Te alabamos, Señor." },
      { kind: "reading", label: "Lectura breve", text: "Lectura breve del día según la liturgia.", rubric: "Leer en silencio y meditar." },
      { kind: "gospelCanticle", label: "Cántico evangélico", text: "Mi alma magnifica al Señor, y mi espíritu se alegra en Dios mi Salvador.", response: "Te alabamos, Señor." },
      { kind: "intercessions", label: "Preces", text: "Oremos por el mundo, por Venezuela, por los que sufren.", response: "Te rogamos, Señor." },
      { kind: "ourFather", label: "Padre nuestro", text: "Padre nuestro, que estás en el cielo, santificado sea tu nombre." },
      { kind: "concludingPrayer", label: "Oración conclusiva", text: "Señor, te entregamos esta jornada. Que todo sea para tu gloria. Amén." },
      { kind: "marianAntiphon", label: "Antífona mariana", text: "Dios te salve, María, llena eres de gracia, el Señor es contigo." },
    ],
  };
}

function getDefaultCompline(): any {
  return {
    title: "Completas del día",
    hour: "21:00",
    mood: "night",
    body: "En tus manos, Señor, encomiendo mi espíritu.",
    parts: [
      { kind: "examination", label: "Examen de conciencia", text: "Revisa tu día con gratitud y perdón. En silencio, examina tu conciencia." },
      { kind: "hymn", label: "Himno", text: "Ante el descanso, Señor, te confío mi alma y mi corazón." },
      { kind: "psalmody", label: "Salmo", text: "En tus manos, Señor, encomiendo mi espíritu. Tú me redimes, Señor, Dios fiel.", response: "Te alabamos, Señor." },
      { kind: "reading", label: "Lectura breve", text: "Lectura breve del día según la liturgia.", rubric: "Leer en silencio y meditar." },
      { kind: "response", label: "Responsorio", text: "Protégenos, Señor, mientras dormimos.", response: "Ten piedad de nosotros." },
      { kind: "gospelCanticle", label: "Cántico de Simeón", text: "Ahora, Señor, despides a tu siervo en paz, según tu palabra.", response: "Te alabamos, Señor." },
      { kind: "concludingPrayer", label: "Oración conclusiva", text: "Señor, bajo la sombra de tu amor me duermo. Amén." },
      { kind: "commendation", label: "Encomienda", text: "En tus manos, Señor, encomiendo mi vida. Amén." },
    ],
  };
}

function getDefaultLiturgy(date: string): any {
  return {
    date,
    weekday: "",
    season: "",
    liturgicalColor: "",
    liturgicalRank: "feria",
    isSolemnity: false,
    saint: { name: "San José Gregorio Hernández", title: "Padre de los Pobres", story: "Modelo de caridad y entrega.", highlights: [], lessons: [], gospelConnection: "Entrega y misericordia.", venezuelaRelevance: "Patrono de Venezuela.", prayer: "Intercede por nosotros." },
    quote: { text: "El Señor es mi pastor, nada me falta.", ref: "Salmo 23:1" },
    gospel: { ref: "", title: "", body: "", evangelist: "" },
    psalm: { ref: "", title: "", body: "", response: "" },
    firstReading: { ref: "", title: "", body: "" },
    secondReading: null,
    marian: { source: "San José Gregorio Hernández", text: "Confía en la Providencia como lo hizo el Padre de los Pobres.", relevant: true, reason: "" },
    reflection: "Síntesis del día: confía en el Señor y vive el evangelio con entrega.",
    catechism: publicDomainCatechism(date),
    laudes: { title: "Laudes", hour: "07:00", mood: "dawn", parts: [] },
    vespers: { title: "Vísperas", hour: "18:00", mood: "dusk", parts: [] },
    compline: { title: "Completas", hour: "21:00", mood: "night", parts: [] },
    angelus: { title: "Ángelus", body: "", verses: [], closingPrayer: "" },
    imagePrompt: "",
    messages: [{ source: "San José Gregorio Hernández", text: "Dios te invita hoy a vivir el evangelio con mayor entrega.", relevant: true }],
    onThisDay: null,
    suggestedNovenas: null,
  };
}

async function generateBibleDaily(env: any, userId: string, targetDate?: string): Promise<any> {
  const target = targetDate || getTodayKey();

  let todayLiturgy: any = null;
  try {
    todayLiturgy = await supabaseFetchDaily(env, target);
    if (!todayLiturgy) {
      todayLiturgy = await cachedOrGenerate(env);
    }
  } catch (e) {
    console.warn("No se pudo obtener la liturgia diaria para context bíblico:", e);
  }

  let profile: any = null;
  try {
    const profiles = await supabaseSelect(env, 'user_bible_profile', { user_id: `eq.${userId}` });
    profile = profiles?.[0] || null;
  } catch (e: any) {
    console.warn('Bible profile fetch failed, using defaults', e.message);
    profile = null;
  }

  const level = profile?.level || 'nunca_lei';
  const minutes = profile?.minutes_per_day || 10;
  const goal = profile?.goal || 'conocer_a_jesus';
  const topic = profile?.topic || '';
  const userName = profile?.full_name || 'hermano/a';

  const goalLabels: Record<string, string> = {
    conocer_a_jesus: 'conocer a Jesús',
    orar_mejor: 'orar mejor',
    entender_la_biblia: 'entender la Biblia',
    seguir_la_misa: 'seguir la liturgia y la Misa',
    perdon: 'el perdón y la misericordia',
    ansiedad: 'la ansiedad y la paz interior',
    duelo: 'el duelo y la esperanza',
    familia: 'la familia',
    vocacion: 'la vocación',
    esperanza: 'la esperanza',
  };

  const goalText = goalLabels[goal] || 'crecer en la fe';

  const gospelRef = todayLiturgy?.gospel?.ref || "Evangelio del día";
  const gospelText = todayLiturgy?.gospel?.body || "";
  const marianSource = todayLiturgy?.marian?.source || "";
  const marianText = todayLiturgy?.marian?.text || "";

  const prompt = `Eres un guía espiritual católico y acompañante pastoral en la aplicación "Camino".
Genera un mensaje bíblico DIARIO Y PERSONALIZADO para hoy (${target}) para el usuario.

DATOS DEL USUARIO:
- Nombre: ${userName}
- Nivel de lectura: ${level}
- Tiempo disponible: ${minutes} minutos
- Intención/Objetivo: ${goalText}
- Tema personal de interés: ${topic || 'Vida espiritual diaria'}

CONTEXTO LITÚRGICO DEL DÍA (Mismo mensaje que la comunidad lee hoy):
- Evangelio: ${gospelRef} - "${gospelText.slice(0, 300)}..."
- Inspiración Mariana/Santo del día (${marianSource}): "${marianText}"

INSTRUCCIONES:
1. Saluda a ${userName} de forma cálida y fraterna.
2. Relaciona el Evangelio del día con la situación o meta del usuario (${goalText}).
3. Devuelve SOLO JSON estricto con las siguientes claves:

{
  "date": "${target}",
  "passageRef": "${gospelRef}",
  "passageText": "Texto adaptado o pasaje clave relevante para el usuario",
  "contextNote": "Explicación breve del pasaje según su nivel (${level})",
  "reflection": "Mensaje personalizado para ${userName} conectando el evangelio con su vida (max 150 palabras)",
  "prayer": "Oración breve personalizada mencionando las necesidades de ${userName}",
  "action": "Un compromiso o acción sencilla para realizar hoy",
  "verseOfDay": "Versículo clave",
  "suggestedTime": "mañana|mediodia|noche",
  "theme": "Tema espiritual principal",
  "mood": "esperanza|paz|fortaleza|gratitud"
}`;

  const res = await generateWithProviderFallback(
    // Gemini call (AI Studio)
    (model, apiKey) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
          }),
        }
      ),
    // Vertex AI call
    (model, env) =>
      vertexAiGenerateContent(model, env, {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      }),
    env
  );

  const data = await res.json();
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  text = text.replace(/^```(?:json)?\s*[\r\n]/i, "").replace(/[\r\n]*```$/, "").trim();

  let parsed: any;
  try {
    parsed = parseJsonWithRepair(text);
  } catch (e) {
    console.warn("Bible daily JSON parse failed, using default:", e);
    parsed = {
      date: target,
      passageRef: "Salmo 23:1",
      passageText: "El Señor es mi pastor, nada me falta.",
      contextNote: "Un salmo de confianza en Dios.",
      reflection: `Hola ${userName}, confía en el Señor como tu pastor.`,
      prayer: `Señor, te encomiendo a ${userName}.`,
      action: "Lee un pasaje de la Biblia hoy.",
      verseOfDay: "Salmo 23:1",
      suggestedTime: "mañana",
      theme: "Confianza",
      mood: "paz",
    };
  }

  const dailyContent = {
    user_id: userId,
    date: target,
    content: parsed,
    generated_by: 'gemini',
    created_at: new Date().toISOString(),
  };

  await supabaseUpsert(env, 'user_bible_daily_content', dailyContent);

  return dailyContent;
}

async function cachedOrGenerate(env: any): Promise<any> {
  const today = getTodayKey();
  const cached = await env.DAILY_CACHE.get(today, "json");
  if (cached) return cached;

  const liturgy = await generateLiturgy(env);
  await env.DAILY_CACHE.put(today, JSON.stringify(liturgy), { expirationTtl: 172800 });
  await supabaseUpsertDaily(env, today, liturgy);
  return liturgy;
}

function handleWhatsAppVerify(request: Request, env: any): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = env.WHATSAPP_VERIFY_TOKEN;
  if (mode === "subscribe" && token && challenge && token === expected) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

async function handleWhatsAppWebhook(env: any, body: any): Promise<Response> {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return new Response("ok");

  const from = msg.from;
  const adminPhones = (env.ADMIN_PHONE || env.WHATSAPP_ADMIN_PHONES || "")
    .split(",")
    .map((p: string) => p.trim())
    .filter(Boolean);
  if (!adminPhones.includes(from)) return new Response("ignored");

  if (msg.type === "audio") {
    const mediaId = msg.audio.id;
    const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    });
    if (!meta.ok) return new Response("failed", { status: 400 });
    const media = await meta.json();
    const audioRes = await fetch(media.url, {
      headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
    });
    if (!audioRes.ok) return new Response("failed", { status: 400 });

    const allowed = new Set(["laudes", "angelus", "evangelio", "salmo", "reflexion", "canto"]);
    const [rawTag, author = "Comunidad Camino", title = "Audio del día"] =
      (msg.audio.caption || "#canto").split("|").map((s: string) => s.trim());
    const tag = String(rawTag).toLowerCase().replace(/^#/, "");
    if (!allowed.has(tag)) return new Response("invalid tag", { status: 400 });

    const key = `audio/${tag}/${Date.now()}.ogg`;
    await env.CAMINO_AUDIO.put(key, audioRes.body);

    const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/assets`;
    await fetch(supabaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        tag,
        title,
        author: author || "Comunidad Camino",
        r2_key: key,
        uploaded_by: from,
        status: "published",
      }),
    });
  }

  return new Response("ok");
}

async function handleSubscribe(request: Request, env: any): Promise<Response> {
  try {
    const { subscription, channel } = await request.json();
    if (!subscription?.endpoint) {
      return jsonResponse({ error: "Missing subscription" }, 400);
    }

    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    let profileId = null;

    if (token) {
      const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${token}`,
        },
      });
      if (userRes.ok) {
        const user = await userRes.json();
        profileId = user.id;
      }
    }

    await supabaseUpsert(env, "push_subscriptions", {
      profile_id: profileId,
      endpoint: subscription.endpoint,
      subscription: JSON.stringify(subscription),
      user_agent: request.headers.get("user-agent"),
      channel: channel || "web",
    });

    return jsonResponse({ ok: true });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function sendPushNotification(env: any, subscription: any, payload: { title: string; body: string; url?: string }) {
  configureVapid(env);
  const notificationPayload = JSON.stringify(payload);
  await webpush.sendNotification(subscription, notificationPayload);
}

async function handleEmailReminders(request: Request, env: any): Promise<Response> {
  try {
    const { enabled } = await request.json();
    
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return jsonResponse({ error: "Unauthorized" }, 401);

    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!userRes.ok) return jsonResponse({ error: "Unauthorized" }, 401);
    const user = await userRes.json();

    await supabaseUpsert(env, "notification_preferences", {
      profile_id: user.id,
      email_reminders: enabled ?? true,
    });

    return jsonResponse({ ok: true });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function sendEmail(to: string, subject: string, html: string, env: any) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Camino <no-reply@camino.app>",
      to,
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }
}

async function processReminders(env: any): Promise<void> {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMinute = now.getUTCMinutes();
  const today = getTodayKey();

  // Venezuela is UTC-4
  const localHour = ((utcHour - 4) % 24 + 24) % 24;
  const localTimeMinutes = localHour * 60 + utcMinute;

  // 1. 15-minute-before-deadline notifications for pending tasks with a time
  const allPendingTasks = await supabaseSelect(env, "spiritual_tasks", {
    task_date: `eq.${today}`,
    done: "eq.false",
  });

  for (const task of (allPendingTasks || [])) {
    if (!task.profile_id || !task.time) continue;

    const [taskHour, taskMinute] = task.time.split(":").map(Number);
    const taskTimeMinutes = taskHour * 60 + taskMinute;
    const minutesUntilTask = taskTimeMinutes - localTimeMinutes;

    if (minutesUntilTask === 15) {
      const notifiedKey = `notified:${today}:${task.profile_id}:${task.id}`;
      const alreadySent = await env.DAILY_CACHE.get(notifiedKey);
      if (alreadySent) continue;

      const subs = await supabaseSelect(env, "push_subscriptions", {
        profile_id: `eq.${task.profile_id}`,
      });

      for (const sub of subs) {
        try {
          const subscription = JSON.parse(sub.subscription || "{}");
          if (subscription?.endpoint) {
            await sendPushNotification(env, subscription, {
              title: "Camino · Recordatorio",
              body: `Tu tarea "${task.title}" vence en 15 minutos`,
              url: "/regla",
            });
          }
        } catch (e) {
          console.error("Push failed for", sub.endpoint, e);
        }
      }

      await env.DAILY_CACHE.put(notifiedKey, "1", { expirationTtl: 3600 });
    }
  }

  // 2. 6 PM (18:00 local = 22:00 UTC) garden watering reminder
  if (localHour === 18 && utcMinute === 0) {
    const allSubs = await supabaseSelect(env, "push_subscriptions", {});

    for (const sub of (allSubs || [])) {
      if (!sub.profile_id) continue;

      const notifiedKey = `notified:garden:${today}:${sub.profile_id}`;
      const alreadySent = await env.DAILY_CACHE.get(notifiedKey);
      if (alreadySent) continue;

      const events = await supabaseSelect(env, "garden_events", {
        user_id: `eq.${sub.profile_id}`,
        created_at: `gte.${today}T00:00:00`,
      });

      const hasWateredToday = (events || []).some(
        (e: any) => e.event_type === "WATER_GARDEN",
      );

      if (!hasWateredToday) {
        try {
          const subscription = JSON.parse(sub.subscription || "{}");
          if (subscription?.endpoint) {
            await sendPushNotification(env, subscription, {
              title: "Camino · 🌱 Jardín",
              body: "Aún no has regado tu jardín. ¿Te falta un momento?",
              url: "/jardin",
            });
          }
        } catch (e) {
          console.error("Garden push failed for", sub.endpoint, e);
        }

        await env.DAILY_CACHE.put(notifiedKey, "1", { expirationTtl: 3600 });
      }
    }
  }

  // 3. 3 PM (15:00 local = 19:00 UTC) Divina Misericordia prayer reminder
  if (localHour === 15 && utcMinute === 0) {
    const allSubs = await supabaseSelect(env, "push_subscriptions", {});

    for (const sub of (allSubs || [])) {
      if (!sub.profile_id) continue;

      const notifiedKey = `notified:divina-misericordia:${today}:${sub.profile_id}`;
      const alreadySent = await env.DAILY_CACHE.get(notifiedKey);
      if (alreadySent) continue;

      try {
        const subscription = JSON.parse(sub.subscription || "{}");
        if (subscription?.endpoint) {
          await sendPushNotification(env, subscription, {
            title: "Camino · Oración",
            body: "Es hora de rezar la Coronilla de la Divina Misericordia",
            url: "/#/divina-misericordia",
          });
        }
      } catch (e) {
        console.error("Divina Misericordia push failed for", sub.endpoint, e);
      }

      await env.DAILY_CACHE.put(notifiedKey, "1", { expirationTtl: 3600 });
    }
  }

  // 4. Hourly task reminders (correct UTC mapping for Venezuela UTC-4)
  const hourTaskMap: Record<number, string> = {
    11: "laudes",
    16: "angelus",
    0: "rosary",
  };

  const taskType = hourTaskMap[utcHour];
  if (!taskType) return;

  // Buscar tareas pendientes pendientes para hoy
  const tasks = await supabaseSelect(env, "spiritual_tasks", {
    task_date: `eq.${today}`,
    done: "eq.false",
    category: `eq.${taskType}`,
  });

  if (!tasks || tasks.length === 0) return;

  // Enviar push a cada usuario con tareas pendientes
  for (const task of tasks) {
    if (!task.profile_id) continue;

    const subs = await supabaseSelect(env, "push_subscriptions", {
      profile_id: `eq.${task.profile_id}`,
    });

    for (const sub of subs) {
      try {
        const subscription = JSON.parse(sub.subscription || "{}");
        if (subscription?.endpoint) {
          await sendPushNotification(env, subscription, {
            title: "Camino · Recordatorio",
            body: `Es hora de: ${task.title || taskType}`,
            url: "/",
          });
        }
      } catch (e) {
        console.error("Push failed for", sub.endpoint, e);
      }
    }
  }

  // Enviar correo a usuarios con recordatorios activados
  const emailPrefs = await supabaseSelect(env, "notification_preferences", {
    email_reminders: "eq.true",
  });

  for (const pref of emailPrefs) {
    const pendingTasks = tasks.filter((t: any) => t.profile_id === pref.profile_id);
    if (pendingTasks.length === 0) continue;

    // Obtener email del perfil de auth/users
    const profileRes = await fetch(`${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${pref.profile_id}&select=email,full_name`, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      },
    });
    const profiles = profileRes.ok ? await profileRes.json() : [];
    const profile = profiles[0];
    const userEmail = profile?.email;
    const userName = profile?.full_name || "amigo";

    if (!userEmail) continue;

    const taskList = pendingTasks.map((t: any) => `<li>${t.title || taskType}</li>`).join("");
    await sendEmail(
      userEmail,
      `Camino · Tienes ${pendingTasks.length} tarea(s) pendiente(s)`,
      `<p>Hola ${userName},</p>
       <p>Tienes estas tareas pendientes para hoy:</p>
       <ul>${taskList}</ul>
       <p><a href="https://camino-6vx.pages.dev">Abrir Camino</a></p>`,
      env
    );
  }
}

async function generateImage(env: any, prompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY && !env.VERTEX_SERVICE_ACCOUNT_JSON) {
    throw new Error("GEMINI_API_KEY or VERTEX_SERVICE_ACCOUNT_JSON not configured");
  }

  const res = await generateWithProviderFallback(
    // Gemini call (AI Studio - Imagen uses predict endpoint)
    (model, apiKey) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio: "1:1",
              personGeneration: "allow_all",
            },
          }),
        }
      ),
    // Vertex AI call (Imagen uses predict endpoint)
    (model, env) =>
      vertexAiPredict(model, env, {
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          personGeneration: "allow_all",
        },
      }),
    env
  );

  const data = await res.json();
  const prediction = data?.predictions?.[0] ?? data?.candidates?.[0];
  const image = prediction?.image ?? prediction?.bytesBase64Encoded;
  const mimeType = prediction?.image?.mimeType || "image/png";
  const base64 = prediction?.image?.bytesBase64Encoded || prediction?.image?.base64;

  if (!base64) {
    throw new Error("Imagen 3 response missing image data");
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const today = getTodayKey();
  const key = `generated/${today}/${Date.now()}.${mimeType.split("/")[1] || "png"}`;
  await env.CAMINO_IMAGES.put(key, bytes, {
    httpMetadata: { contentType: mimeType },
  });

  const baseUrl = env.R2_IMAGES_BASE_URL || "https://images.camino.app";
  return `${baseUrl}/${key}`;
}

async function handleAdminUsersSearch(request: Request, env: any): Promise<Response> {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
    const limit = parseInt(new URL(request.url).searchParams.get("limit") || "20", 10);

    if (!q) {
      const profiles = await supabaseSelect(env, "profiles", { select: "id,email,full_name", limit: String(limit), order: "email.asc" });
      if (profiles && profiles.length > 0) {
        return jsonResponse({ results: profiles });
      }
      const authUrl = `${env.SUPABASE_URL}/auth/v1/admin/users?limit=${limit}`;
      const authRes = await fetch(authUrl, {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
        },
      });
      if (!authRes.ok) {
        const text = await authRes.text();
        return jsonResponse({ error: `Supabase auth users failed: ${authRes.status} ${text}` }, 500);
      }
      const authData = await authRes.json();
      const users = Array.isArray(authData?.users) ? authData.users : [];
      const results = users.slice(0, limit).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.email,
      }));
      return jsonResponse({ results });
    }

    if (q.length < 2) {
      return jsonResponse({ results: [] });
    }

    const encodedQ = encodeURIComponent(q);
    const profilesUrl = `${env.SUPABASE_URL}/rest/v1/profiles?select=id,email,full_name&or=(email.ilike.*${encodedQ}*,full_name.ilike.*${encodedQ}*)&order=email.asc&limit=${limit}`;
    const profilesRes = await fetch(profilesUrl, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      },
    });

    if (profilesRes.ok) {
      const data = await profilesRes.json();
      return jsonResponse({ results: data });
    }

    const authUrl = `${env.SUPABASE_URL}/auth/v1/admin/users?limit=${limit}`;
    const authRes = await fetch(authUrl, {
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      },
    });

    if (!authRes.ok) {
      const text = await profilesRes.text();
      return jsonResponse({ error: `Supabase search failed: profiles=${profilesRes.status} ${text}, auth=${authRes.status}` }, 500);
    }

    const authData = await authRes.json();
    const users = Array.isArray(authData?.users) ? authData.users : [];
    const results = users
      .filter((u: any) => {
        const email = (u?.email || "").toLowerCase();
        const name = (u?.user_metadata?.full_name || u?.email || "").toLowerCase();
        return email.includes(q) || name.includes(q);
      })
      .slice(0, limit)
      .map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.user_metadata?.full_name || u.email,
      }));

    return jsonResponse({ results });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

async function handleAdminAssignTasks(request: Request, env: any): Promise<Response> {
  try {
    const body = await request.json();
    const target = body?.target;
    const userIds: string[] = [];

    if (target === "all") {
      let users = await supabaseSelect(env, "profiles", { select: "id" });
      if (!users || users.length === 0) {
        const authRes = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users?limit=1000`, {
          headers: {
            apikey: env.SUPABASE_SERVICE_ROLE,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
          },
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          users = (Array.isArray(authData?.users) ? authData.users : []).map((u: any) => ({ id: u.id }));
        }
      }
      userIds.push(...users.map((u: any) => u.id));
    } else if (target === "single" && typeof body?.userId === "string" && body.userId.trim()) {
      userIds.push(body.userId.trim());
    } else {
      return jsonResponse({ error: "Invalid target" }, 400);
    }

    if (userIds.length === 0) {
      return jsonResponse({ error: "No users found" }, 400);
    }

    const taskDate = typeof body?.taskDate === "string" ? body.taskDate : getTodayKey();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    if (tasks.length === 0) {
      return jsonResponse({ error: "No tasks provided" }, 400);
    }

    const rows: any[] = [];
    for (const userId of userIds) {
      for (const t of tasks) {
        const title = typeof t.title === "string" ? t.title.trim() : "";
        const category = typeof t.category === "string" ? t.category : "custom";
        const cadence = typeof t.cadence === "string" ? t.cadence : "daily";
        if (!title) continue;
        rows.push({
          profile_id: userId,
          title,
          category,
          cadence,
          time: typeof t.time === "string" ? t.time : null,
          required: Boolean(t.required),
          done: false,
          task_date: taskDate,
        });
      }
    }

    if (rows.length === 0) {
      return jsonResponse({ error: "No valid tasks" }, 400);
    }

    // Delete existing tasks for the same profile_id, category, and task_date to avoid unique constraint violations
    // Construct URL manually — URLSearchParams would URL-encode parentheses/commas which breaks PostgREST `in` operator
    const categories = tasks.map((t: any) => typeof t.category === "string" ? t.category : "custom");
    const userIdsList = userIds.join(",");
    const categoriesList = categories.map((c: string) => `'${c}'`).join(",");
    const deleteUrl = `${env.SUPABASE_URL}/rest/v1/spiritual_tasks?profile_id=in.(${userIdsList})&category=in.(${categoriesList})&task_date=eq.${encodeURIComponent(taskDate)}`;
    const deleteRes = await fetch(deleteUrl, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        apikey: env.SUPABASE_SERVICE_ROLE,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
      },
    });
    if (!deleteRes.ok) {
      const text = await deleteRes.text();
      return jsonResponse({ error: `Supabase delete failed: ${deleteRes.status} ${text}` }, 500);
    }

    const url = `${env.SUPABASE_URL}/rest/v1/spiritual_tasks`;
    const chunks: any[] = [];
    const chunkSize = 50;
    for (let i = 0; i < rows.length; i += chunkSize) {
      chunks.push(rows.slice(i, i + chunkSize));
    }

    let inserted = 0;
    for (const chunk of chunks) {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.SUPABASE_SERVICE_ROLE,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(chunk),
      });
      if (!res.ok) {
        const text = await res.text();
        return jsonResponse({ error: `Supabase insert failed: ${res.status} ${text}`, inserted }, 500);
      }
      inserted += chunk.length;
    }

    return jsonResponse({ ok: true, inserted, users: userIds.length });
  } catch (e: any) {
    return jsonResponse({ error: e.message }, 500);
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  } as Record<string, string>;
}

function jsonResponse(body: any, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
      ...extra,
    },
  });
}

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === "/whatsapp") {
      if (request.method === "GET") return handleWhatsAppVerify(request, env);
      if (request.method === "POST") {
        let body: any = {};
        try {
          body = await request.json();
        } catch {
          return new Response("ok");
        }
        return handleWhatsAppWebhook(env, body);
      }
    }

    if (url.pathname === "/daily" && request.method === "GET") {
      try {
        const date = url.searchParams.get("date") || getTodayKey();
        let liturgy = await supabaseFetchDaily(env, date);
        if (!liturgy) liturgy = await cachedOrGenerate(env);

        let oraciones = null;
        try {
          oraciones = await supabaseFetchOraciones(env, date);
        } catch {
          // oraciones_diarias table may not exist yet
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

    if (url.pathname === "/daily/generate" && request.method === "POST") {
      try {
        const body = await request.json();
        const targetDate = (body && typeof body === "object" && "date" in body)
          ? String(body.date)
          : getTodayKey();
        const liturgy = await generateLiturgy(env, targetDate);
        await env.DAILY_CACHE.put(targetDate, JSON.stringify(liturgy), { expirationTtl: 172800 });
        await supabaseUpsertDaily(env, targetDate, liturgy);
        return jsonResponse(liturgy);
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    if (url.pathname === "/daily" && request.method === "POST") {
      try {
        const body = await request.json();
        const targetDate = (body && typeof body === "object" && "date" in body)
          ? String(body.date)
          : getTodayKey();
        const liturgy = body;
        delete liturgy.date;
        await env.DAILY_CACHE.put(targetDate, JSON.stringify(liturgy), { expirationTtl: 172800 });
        await supabaseUpsertDaily(env, targetDate, liturgy);
        return jsonResponse(liturgy);
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    if (url.pathname === "/generate-image" && request.method === "POST") {
      try {
        const body = await request.json();
        const prompt = typeof body === "string" ? body : body?.prompt;
        if (!prompt || typeof prompt !== "string") {
          return jsonResponse({ error: "Missing prompt" }, 400);
        }
        const imageUrl = await generateImage(env, prompt);
        return jsonResponse({ url: imageUrl });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

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

      if (url.pathname === "/notifications/vapid-public-key" && request.method === "GET") {
      return handleVapidKey(request, env);
    }

    if (url.pathname === "/notifications/subscribe" && request.method === "POST") {
      return handleSubscribe(request, env);
    }

    if (url.pathname === "/notifications/email/reminders" && request.method === "POST") {
      return handleEmailReminders(request, env);
    }

    if (url.pathname === "/admin/users/search" && request.method === "GET") {
      return handleAdminUsersSearch(request, env);
    }

    if (url.pathname === "/admin/tasks" && request.method === "POST") {
      return handleAdminAssignTasks(request, env);
    }

    if (url.pathname === "/bible/daily" && request.method === "GET") {
      try {
        const userId = url.searchParams.get("user_id");
        const date = url.searchParams.get("date") || getTodayKey();
        if (!userId) return jsonResponse({ error: "Missing user_id" }, 400);
        const data = await supabaseSelect(env, 'user_bible_daily_content', {
          user_id: `eq.${encodeURIComponent(userId)}`,
          date: `eq.${encodeURIComponent(date)}`,
        });
        return jsonResponse(data?.[0] || null);
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    if (url.pathname === "/bible/daily" && request.method === "POST") {
       try {
         const body: any = await request.json().catch(() => ({}));
         const userId = typeof body?.user_id === "string" ? body.user_id : "";
         const targetDate = typeof body?.date === "string" && body.date ? body.date : getTodayKey();
         if (!userId) return jsonResponse({ error: "Missing user_id" }, 400);

         let content = null;
         try {
           const existing = await supabaseSelect(env, 'user_bible_daily_content', {
             user_id: `eq.${encodeURIComponent(userId)}`,
             date: `eq.${encodeURIComponent(targetDate)}`,
           });
           content = existing?.[0] || null;
         } catch {
           content = null;
         }

         if (!content) {
           content = await generateBibleDaily(env, userId, targetDate);
         }

         return jsonResponse(content);
       } catch (e: any) {
         return jsonResponse({ error: e.message }, 500);
       }
     }

      if (url.pathname === "/admin/upload-image" && request.method === "POST") {
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          const kind = (formData.get("kind") as string) || "daily";
          const targetDate = (formData.get("date") as string) || getTodayKey();

          if (!file || !(file instanceof Blob)) {
            return jsonResponse({ error: "Missing file" }, 400);
          }

          const ext = file.name.split(".").pop() || "jpg";
          const mimeType = file.type || "image/jpeg";
          const key = `images/${kind}/${targetDate}/${Date.now()}.${ext}`;
          const bytes = new Uint8Array(await file.arrayBuffer());
          await env.CAMINO_IMAGES.put(key, bytes, {
            httpMetadata: { contentType: mimeType },
          });

          const baseUrl = env.R2_IMAGES_BASE_URL || "https://images.camino.app";
          const imageUrl = `${baseUrl}/${key}`;
          return jsonResponse({ url: imageUrl });
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      if (url.pathname === "/admin/upload-audio" && request.method === "POST") {
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File | null;
          const tag = (formData.get("tag") as string || "canto").toLowerCase().trim();
          const title = (formData.get("title") as string || "").trim();
          const author = (formData.get("author") as string || "Admin").trim();

          if (!file || !(file instanceof Blob)) {
            return jsonResponse({ error: "Missing file" }, 400);
          }
          if (!title) {
            return jsonResponse({ error: "Missing title" }, 400);
          }

          const allowed = new Set(["laudes", "angelus", "evangelio", "salmo", "reflexion", "canto"]);
          if (!allowed.has(tag)) {
            return jsonResponse({ error: "Invalid tag" }, 400);
          }

          const ext = file.name.split(".").pop() || "ogg";
          const mimeType = file.type || "audio/ogg";
          const key = `audio/${tag}/${Date.now()}.${ext}`;
          const bytes = new Uint8Array(await file.arrayBuffer());
          await env.CAMINO_AUDIO.put(key, bytes, {
            httpMetadata: { contentType: mimeType },
          });

          const supabaseUrl = `${env.SUPABASE_URL}/rest/v1/assets`;
          const assetRes = await fetch(supabaseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: env.SUPABASE_SERVICE_ROLE,
              Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              tag,
              title,
              author,
              r2_key: key,
              uploaded_by: "admin",
              status: "published",
            }),
          });

          if (!assetRes.ok) {
            const text = await assetRes.text();
            return jsonResponse({ error: `Supabase insert failed: ${assetRes.status} ${text}` }, 500);
          }

          const assetData = await assetRes.json();
          return jsonResponse({ ok: true, asset: Array.isArray(assetData) ? assetData[0] : assetData });
        } catch (e: any) {
          return jsonResponse({ error: e.message }, 500);
        }
      }

      if (url.pathname === "/admin/daily-images" && request.method === "GET") {
       try {
         const targetDate = url.searchParams.get("date") || getTodayKey();
         const row = await supabaseFetchDaily(env, targetDate);
         if (!row) return jsonResponse({ error: "Not found" }, 404);
         return jsonResponse({
           saintImageUrl: row.saint?.imageUrl ?? null,
           dailyImageUrl: row.imageUrl ?? null,
         });
       } catch (e: any) {
         return jsonResponse({ error: e.message }, 500);
       }
     }

     if (url.pathname === "/admin/daily-images" && request.method === "POST") {
       try {
         const body: any = await request.json().catch(() => ({}));
         const targetDate = typeof body?.date === "string" && body.date ? body.date : getTodayKey();
         const saintImageUrl = typeof body?.saintImageUrl === "string" ? body.saintImageUrl : null;
         const dailyImageUrl = typeof body?.dailyImageUrl === "string" ? body.dailyImageUrl : null;

         let existing: any = null;
         try {
           existing = await supabaseFetchDaily(env, targetDate);
         } catch {
           // no existing record
         }

         if (!existing) {
           return jsonResponse({ error: "No daily liturgy record found for this date. Generate it first." }, 404);
         }

         if (saintImageUrl !== null) {
           existing.saint = { ...(existing.saint || {}), imageUrl: saintImageUrl };
         }
         if (dailyImageUrl !== null) {
           existing.imageUrl = dailyImageUrl;
         }

         await supabaseUpsertDaily(env, targetDate, existing);
         return jsonResponse(existing);
       } catch (e: any) {
         return jsonResponse({ error: e.message }, 500);
       }
     }

     if (url.pathname === "/community/reflections" && request.method === "GET") {
       try {
         const date = url.searchParams.get("date") || getTodayKey();
         const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
         const reflectionsUrl = `${env.SUPABASE_URL}/rest/v1/garden_events?event_type=in.(REFLECTION_COMPLETED,SILENCE_TIME)&created_at=gte.${encodeURIComponent(date)}T00:00:00&select=id,user_id,event_type,value,intention,created_at&order=created_at.desc&limit=${limit}`;
         const res = await fetch(reflectionsUrl, {
           headers: {
             Accept: "application/json",
             apikey: env.SUPABASE_SERVICE_ROLE,
             Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
           },
         });
         if (!res.ok) {
           const text = await res.text();
           return jsonResponse({ error: `Supabase fetch failed: ${res.status} ${text}` }, 500);
         }
         const data = await res.json();
         // enrich with profile info
         const userIds = [...new Set((data as any[]).map((r: any) => r.user_id))];
         let profilesMap: Record<string, any> = {};
         if (userIds.length > 0) {
           const profileIds = userIds.map((uid: string) => `id.eq.${encodeURIComponent(uid)}`).join(",");
           try {
             const profilesUrl = `${env.SUPABASE_URL}/rest/v1/profiles?or=(${profileIds})&select=id,full_name,email`;
             const profilesRes = await fetch(profilesUrl, {
               headers: {
                 apikey: env.SUPABASE_SERVICE_ROLE,
                 Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
               },
             });
             if (profilesRes.ok) {
               const profiles = await profilesRes.json();
               for (const p of profiles) {
                 profilesMap[p.id] = { full_name: p.full_name || "Anónimo", email: p.email };
               }
             }
           } catch {
             // ignore profile enrichment errors
           }
         }
         const enriched = (data as any[]).map((r: any) => ({
           id: r.id,
           type: r.event_type,
           value: r.value,
           intention: r.intention,
           created_at: r.created_at,
           user: profilesMap[r.user_id] || { full_name: "Anónimo" },
         }));
         return jsonResponse({ reflections: enriched });
       } catch (e: any) {
         return jsonResponse({ error: e.message }, 500);
       }
     }

     return new Response("Not Found", { status: 404, headers: corsHeaders() });
  },

  async scheduled(_event: any, env: any, _ctx: ExecutionContext): Promise<void> {
    try {
      await cachedOrGenerate(env);
      await processReminders(env);
      await updatePrayerVideos(env);
    } catch (e) {
      console.error("Cron failed", e);
    }
  },
};