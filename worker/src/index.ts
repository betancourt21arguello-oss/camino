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
  const prompt = `Eres un asistente litúrgico católico experto. Devuelve SOLO JSON válido, sin markdown, sin explicaciones, utilizando un español hispano/latinoamericano (natural, claro y reverente). Usa estas claves exactas para la fecha ${target}:

date, weekday, season, liturgicalColor, liturgicalRank, isSolemnity, saint.name, saint.title, saint.initial, saint.story, saint.highlights[3], saint.lessons[2], saint.exampleToday, saint.gospelConnection, saint.venezuelaRelevance, saint.prayer, quote.text, quote.ref, gospel.ref, gospel.title, gospel.body, gospel.evangelist, psalm.ref, psalm.title, psalm.body, firstReading.ref, firstReading.title, firstReading.body, secondReading.ref, secondReading.title, secondReading.body, laudes.title, laudes.hour, laudes.mood, laudes.parts[7], vespers.title/hour/mood, compline.title/hour/mood, angelus.title/verses[3]/closingPrayer, reflection, catechism.number/title/text/applyToday, onThisDay.title/category/text/venezuela, messages[5 max], suggestedNovenas[2], marian.source/text/relevant.

REGLAS ESTRICTAS:
1) FECHA EXACTA: La información debe corresponder litúrgicamente al ${target}.
2) LECTURAS COMPLETAS: Genera SIEMPRE el texto real y completo de la primera lectura (firstReading), el salmo (psalm) y el evangelio (gospel). NUNCA uses null o textos vacíos. Si el día (${target}) es domingo o solemnidad, genera también la segunda lectura (secondReading) con su texto real; si es un día ferial sin segunda lectura oficial, déjala en null pero asegúrate de que la primera lectura no falle.
3) REFLEXIÓN: El campo 'reflection' DEBE ser una síntesis que conecte tres elementos: el mensaje del Evangelio del día, el ejemplo de vida del Santo del día y una aplicación directa a la realidad, esperanza o cultura de Venezuela.
4) MENSAJES MARIANOS: En el array 'messages', PRIORIZA SIEMPRE incluir al menos un mensaje de la Virgen de Betania (María Virgen y Madre Reconciliadora de todos los Pueblos). Completa el resto con Fátima, Lourdes, Medjugorje, Papas (León XIII, Francisco, Juan Pablo II), San José Gregorio Hernández, Santa Madre Carmen Rendiles, Beata María de San José o Carlo Acutis, que resuenen con el evangelio.
5) ESTRUCTURA DE ORACIONES: Laudes debe tener exactamente 7 partes. Ángelus debe tener 3 versos exactos y la oración final.
6) SANTO DEL DÍA: Provee una historia rica, destacando su conexión con el evangelio y su relevancia para Venezuela (venezuelaRelevance).
7) RANGO: Si es domingo o solemnidad, establece isSolemnity=true y liturgicalRank="solemnidad".
8) FORMATO: Solo utiliza las claves en camelCase listadas. Cero texto fuera del JSON.`;

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

async function handleAdminUsersSearch(request: Request, env: any): Promise<Response> {
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
    if (!q || q.length < 2) {
      return jsonResponse({ results: [] });
    }

    const profilesUrl = `${env.SUPABASE_URL}/rest/v1/profiles?select=id,email,full_name&or=ilike.email.*${encodeURIComponent(q)}*,ilike.full_name.*${encodeURIComponent(q)}*&limit=20`;
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

    const authUrl = `${env.SUPABASE_URL}/auth/v1/admin/users?limit=20`;
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
      .slice(0, 20)
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
          Prefer: "resolution=merge-duplicates,return=minimal",
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

    if (url.pathname === "/admin/users/search" && request.method === "GET") {
      return handleAdminUsersSearch(request, env);
    }

    if (url.pathname === "/admin/tasks" && request.method === "POST") {
      return handleAdminAssignTasks(request, env);
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
