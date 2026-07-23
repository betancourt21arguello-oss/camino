function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function supabaseFetchDaily(env: any, date: string): Promise<any> {
  const url = `${env.SUPABASE_URL}/rest/v1/daily_liturgy?date=eq.${encodeURIComponent(date)}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data[0] || null;
}

async function supabaseUpsert(env: any, date: string, liturgy: any): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/daily_liturgy`;
  const body = {
    date,
    weekday: liturgy.weekday,
    season: liturgy.season,
    liturgical_color: liturgy.liturgicalColor,
    saint: liturgy.saint,
    quote: liturgy.quote,
    gospel: liturgy.gospel,
    psalm: liturgy.psalm,
    first_reading: liturgy.firstReading,
    second_reading: liturgy.secondReading ?? null,
    laudes: liturgy.laudes,
    reflection: liturgy.reflection,
    image_url: liturgy.imageUrl,
    marian: liturgy.marian,
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

async function generateLiturgy(env: any): Promise<any> {
  const today = getTodayKey();
  const prompt = `Eres un asistente litúrgico católico. Devuelve SOLO JSON válido con esta forma:
{ "date":"${today}","weekday","season","liturgicalColor",
  "saint": {"name","title","initial"},
  "quote": {"text","ref"},
  "gospel": {"ref","title","body"},
  "psalm": {"ref","title","body"},
  "firstReading": {"ref","title","body"},
  "secondReading": {"ref","title","body"} | null,
  "laudes": {"title","body"},
  "reflection": "...",
  "imagePrompt": "...",
  "marian": {"source":"Betania"|"Medjugorje","text","relevant":true|false} }
Para la fecha ${today}. Incluye Evangelio, Salmo, 1ª y 2ª lectura (si aplica),
Laudes, reflexión, santo del día y —si es relevante ese día— un mensaje de la
Virgen de Betania o de Medjugorje. Marca "relevant": false si no aplica.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const parsed = JSON.parse(text);
  parsed.date = today;
  return parsed;
}

async function cachedOrGenerate(env: any): Promise<any> {
  const today = getTodayKey();
  const cached = await env.DAILY_CACHE.get(today, "json");
  if (cached) return cached;

  const liturgy = await generateLiturgy(env);
  await env.DAILY_CACHE.put(today, JSON.stringify(liturgy), { expirationTtl: 172800 });
  await supabaseUpsert(env, today, liturgy);
  return liturgy;
}

function handleWhatsAppVerify(request: Request): Response {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

async function handleWhatsAppWebhook(env: any, body: any): Promise<Response> {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return new Response("ok");

  const from = msg.from;
  if (from !== env.ADMIN_PHONE) return new Response("ignored");

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

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
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
      if (request.method === "GET") return handleWhatsAppVerify(request);
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
        const today = getTodayKey();
        let liturgy = await supabaseFetchDaily(env, today);
        if (!liturgy) liturgy = await cachedOrGenerate(env);
        return jsonResponse(liturgy, 200, {
          "Cache-Control": "public, max-age=300",
        });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  },

  async scheduled(_event: any, env: any, _ctx: ExecutionContext): Promise<void> {
    try {
      await cachedOrGenerate(env);
    } catch (e) {
      console.error("Cron daily generation failed", e);
    }
  },
};
