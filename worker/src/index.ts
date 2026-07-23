import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:admin@camino.app",
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
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
  await supabaseUpsertDaily(env, today, liturgy);
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

async function sendPushNotification(subscription: any, payload: { title: string; body: string; url?: string }) {
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
          await sendPushNotification(subscription, {
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
