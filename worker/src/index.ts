import webpush from "web-push";

let vapidConfigured = false;

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

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
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

async function supabaseUpsertDaily(env: any, date: string, liturgy: any): Promise<void> {
  const url = `${env.SUPABASE_URL}/rest/v1/daily_liturgy`;
  const body: Record<string, any> = {
    date,
    weekday: liturgy.weekday,
    season: liturgy.season,
    liturgical_color: liturgy.liturgicalColor,
    saint: liturgy.saint ?? null,
    quote: liturgy.quote,
    gospel: liturgy.gospel,
    psalm: liturgy.psalm,
    first_reading: liturgy.firstReading ?? liturgy.first_reading ?? null,
    second_reading: liturgy.secondReading ?? liturgy.second_reading ?? null,
    laudes: liturgy.laudes,
    angelus: liturgy.angelus ?? null,
    reflection: liturgy.reflection,
    image_url: liturgy.imageUrl ?? null,
    messages: liturgy.messages ?? (liturgy.marian ? [liturgy.marian] : null),
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

async function generateLiturgy(env: any, targetDate?: string): Promise<any> {
  const target = targetDate || getTodayKey();
  const prompt = `Eres un asistente litúrgico católico experto. Devuelve SOLO JSON válido, sin markdown, sin texto adicional, con esta estructura EXACTA para la fecha ${target}:

{
  "date": "${target}",
  "weekday": "Viernes",
  "season": "Tiempo Ordinario",
  "liturgicalColor": "Verde",
  "isSolemnity": true,
  "liturgicalRank": "solemnidad",
  "saint": {
    "name": "San Chárbel Majluf",
    "title": "Sacerdote Maronita",
    "initial": "SC",
    "story": "Historia corta e interesante del santo, con los datos más relevantes de su vida.",
    "highlights": ["hito 1", "hito 2", "hito 3"],
    "lessons": ["lección 1", "lección 2"],
    "exampleToday": "Cómo su ejemplo nos inspira hoy.",
    "gospelConnection": "Cómo su vida se conecta con el Evangelio del día.",
    "venezuelaRelevance": "Relevancia para los feligreses en Venezuela.",
    "prayer": "Oración corta al santo."
  },
  "quote": {"text": "cita bíblica o de santo para el día", "ref": "referencia"},
  "gospel": {"ref": "referencia", "title": "título", "body": "texto completo", "evangelist": "san Mateo", "introFormula": "...", "closingProclaim": "...", "closingResponse": "...", "threeCrosses": true},
  "psalm": {"ref": "referencia", "title": "título", "body": "texto completo del salmo responsorial"},
  "firstReading": {"ref": "referencia", "title": "título", "body": "texto completo"},
  "secondReading": {"ref": "referencia", "title": "título", "body": "texto completo"},
  "laudes": {
    "title": "Laudes",
    "body": "cuerpo/resumen",
    "hour": "07:00",
    "mood": "dawn",
    "parts": [
      {"kind": "hymn", "label": "Himno", "text": "..."},
      {"kind": "psalmody", "label": "Salmo", "text": "...", "response": "R. ..."},
      {"kind": "reading", "label": "Breve lectura", "text": "...", "rubric": "..."},
      {"kind": "gospelCanticle", "label": "Benedictus", "text": "..."},
      {"kind": "intercessions", "label": "Intercesiones", "text": "..."},
      {"kind": "ourFather", "label": "Padre Nuestro", "text": "..."},
      {"kind": "concludingPrayer", "label": "Oración final", "text": "..."}
    ]
  },
  "vespers": {"title": "Vísperas", "body": "...", "hour": "19:00", "mood": "dusk", "parts": []},
  "compline": {"title": "Completas", "body": "...", "hour": "21:30", "mood": "night", "parts": []},
  "angelus": {
    "title": "Ángelus",
    "body": "texto",
    "verses": [
      {"leader": "V. El Ángel del Señor anunció a María", "response": "R. Y concibió del Espíritu Santo"},
      {"leader": "V. He aquí la esclava del Señor", "response": "R. Hágase en mí según tu palabra"},
      {"leader": "V. El Verbo se hizo carne", "response": "R. Y habitó entre nosotros"}
    ],
    "closingPrayer": "Oración final del Ángelus"
  },
  "reflection": "reflexión espiritual extensa conectando las lecturas con la vida cotidiana",
  "imagePrompt": "descripción detallada para imagen sagrada del día",
  "imageUrl": "",
  "catechism": {"number": "...", "title": "...", "text": "...", "applyToday": "..."},
  "onThisDay": {"title": "...", "category": "...", "text": "...", "venezuela": "..."},
  "messages": [
    {"source": "Papa Francisco", "text": "mensaje relacionado con el Evangelio del día", "relevant": true}
  ],
  "suggestedNovenas": [{"title": "...", "reason": "..."}],
  "marian": {"source": "Betania", "text": "...", "relevant": true}
}

REGLAS FUNDAMENTALES:
1. Fecha exacta: ${target}. Determina correctamente día de la semana, temporada y rango litúrgico.
2. Segunda lectura: DEBE incluirse SIEMPRE con contenido real del día. NUNCA null.
3. Laudes: incluye al menos 7 partes (himno, salmodia, breve lectura, cántico evangélico, intercesiones, Padrenuestro, oración final).
4. Ángelus: incluye los 3 versos completos (V. / R.) y la oración final.
5. Santo del día: historia rica, highlights (array), lecciones (array), conexión con Evangelio, relevancia para Venezuela, oración propia.
6. Solemnidad: si es domingo o solemnidad => isSolemnity=true, liturgicalRank="solemnidad".
7. Mensajes: de Betania, Medjugorje, Fátima, Lourdes, Papas (León XIV, Francisco, San Juan Pablo II), Carlo Acutis, San José Gregorio Hernández, Santa Madre Carmen Rendiles, Beata María de San José. DIRECTAMENTE relacionados con el Evangelio o la fecha. Incluye TODAS las coincidencias. Máximo 5.
9. Usa EXACTAMENTE las claves en camelCase como se muestra arriba. No inventes claves nuevas.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
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
  let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  text = text.replace(/^```(?:json)?\s*[\r\n]/i, "").replace(/[\r\n]*```$/, "").trim();
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === "object") {
    const snakeToCamel = (obj: any): any => {
      if (Array.isArray(obj)) return obj.map(snakeToCamel);
      if (obj && typeof obj === "object") {
        const out: Record<string, any> = {};
        for (const key of Object.keys(obj)) {
          const camel = key
            .replace(/_([a-z])/g, (_, c) => c.toUpperCase())
            .replace(/^([A-Z])/, (c) => c.toLowerCase());
          out[camel] = snakeToCamel(obj[key]);
        }
        return out;
      }
      return obj;
    };
    Object.assign(parsed, snakeToCamel(parsed));
  }
  parsed.date = target;
  return parsed;
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
  const today = getTodayKey();

  // Mapa de horas UTC a tipo de tarea
  const hourTaskMap: Record<number, string> = {
    7: "laudes",
    12: "angelus",
    20: "rosario",
  };

  const taskType = hourTaskMap[utcHour];
  if (!taskType) return;

  // Buscar tareas pendientes pendientes para hoy
  const tasks = await supabaseSelect(env, "spiritual_tasks", {
    task_date: `eq.${today}`,
    done: "eq.false",
    task_type: `eq.${taskType}`,
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
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
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
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Imagen 3 failed: ${res.status} ${text}`);
  }

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

    if (url.pathname === "/notifications/vapid-public-key" && request.method === "GET") {
      return handleVapidKey(request, env);
    }

    if (url.pathname === "/notifications/subscribe" && request.method === "POST") {
      return handleSubscribe(request, env);
    }

    if (url.pathname === "/notifications/email/reminders" && request.method === "POST") {
      return handleEmailReminders(request, env);
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders() });
  },

  async scheduled(_event: any, env: any, _ctx: ExecutionContext): Promise<void> {
    try {
      await cachedOrGenerate(env);
      await processReminders(env);
    } catch (e) {
      console.error("Cron failed", e);
    }
  },
};
