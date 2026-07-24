# 🔔 Configuración de Notificaciones Push — Camino

Este documento detalla cómo resolver el error **"Falta VITE_VAPID_PUBLIC_KEY"** y
activar notificaciones push en el dispositivo y por correo.

---

## 1. Generar las VAPID Keys

Las claves VAPID (Voluntary Application Server Identification) son un par
público/privado que identifican tu servidor ante el servicio push del navegador.

### Opción A: Con `web-push` (Node.js)
```bash
npx web-push generate-vapid-keys
```
Produce algo como:
```
Public Key:  BHn7E...largo...base64url
Private Key: xK9f3...largo...base64url
```

### Opción B: Online
Usa https://vapidkeys.com para generar las claves directamente.

---

## 2. Configurar las variables de entorno

### Frontend (`.env.local` o Cloudflare Pages Environment Variables)
```env
VITE_VAPID_PUBLIC_KEY=BHn7E...tu_clave_publica...
```
En Cloudflare Pages:
1. Abre tu proyecto en https://dash.cloudflare.com
2. Settings → Environment Variables
3. Añade `VITE_VAPID_PUBLIC_KEY` con el valor de la clave pública

### Worker (`wrangler.toml` o Cloudflare Workers secrets)
```bash
wrangler secret put VAPID_PUBLIC_KEY
# pega la clave pública

wrangler secret put VAPID_PRIVATE_KEY
# pega la clave privada
```

---

## 3. Instalar `web-push` en el Worker

En tu proyecto de Cloudflare Worker:
```bash
npm install web-push
```

O si usas un Worker modular sin npm, puedes usar la Web Push Protocol
directamente con `crypto.subtle` (ver
https://web.dev/articles/push-notifications-web-push-protocol).

---

## 4. Endpoint del Worker: `/notifications/subscribe`

El frontend envía la suscripción push al Worker:

```ts
// Worker: POST /notifications/subscribe
export async function handleSubscribe(request: Request, env: Env) {
  const { subscription, channel } = await request.json();
  const userId = await getUserIdFromAuth(request, env);

  // Guardar en Supabase
  await supabaseInsert(env, "push_subscriptions", {
    profile_id: userId,
    endpoint: subscription.endpoint,
    subscription: JSON.stringify(subscription),
    user_agent: request.headers.get("user-agent"),
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
```

---

## 5. Endpoint del Worker: Enviar notificación push

```ts
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:admin@camino.app",
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY,
);

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: { title: string; body: string; url?: string },
) {
  await webpush.sendNotification(
    subscription,
    JSON.stringify(payload),
  );
}
```

---

## 6. Cron de recordatorios (tareas pendientes)

Configura un cron en el Worker que se ejecute varias veces al día:

```toml
# wrangler.toml
[triggers]
crons = ["0 7 * * *", "0 12 * * *", "0 20 * * *"]
```

```ts
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    const hour = new Date().getUTCHours();
    const today = new Date().toISOString().slice(0, 10);

    // Buscar tareas pendientes para esta hora
    const tasks = await supabaseQuery(env, "spiritual_tasks", {
      task_date: today,
      done: false,
      // Filtrar por hora: laudes a las 7, ángelus a las 12, rosario a las 20
    });

    for (const task of tasks) {
      // Buscar suscripciones push del usuario
      const subs = await supabaseQuery(env, "push_subscriptions", {
        profile_id: task.profile_id,
      });

      for (const sub of subs) {
        await sendPushNotification(JSON.parse(sub.subscription), {
          title: "Camino · Recordatorio",
          body: `Es hora de: ${task.title}`,
          url: "/",
        });
      }
    }
  },
};
```

---

## 7. Notificaciones por correo (Supabase + Resend/SendGrid)

### Endpoint: `/notifications/email/reminders`
```ts
export async function handleEmailReminders(request: Request, env: Env) {
  const userId = await getUserIdFromAuth(request, env);

  // Activar preferencia en Supabase
  await supabaseUpsert(env, "notification_preferences", {
    profile_id: userId,
    email_reminders: true,
  });

  return new Response(JSON.stringify({ ok: true }));
}
```

### Cron de correo
```ts
// Dentro del mismo scheduled handler:
const emailPrefs = await supabaseQuery(env, "notification_preferences", {
  email_reminders: true,
});

for (const pref of emailPrefs) {
  const pendingTasks = tasks.filter((t) => t.profile_id === pref.profile_id);
  if (pendingTasks.length === 0) continue;

  const user = await supabaseGetUser(env, pref.profile_id);
  if (!user?.email) continue;

  // Enviar correo con Resend (o SendGrid, Postmark, etc.)
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Camino <no-reply@camino.app>",
      to: user.email,
      subject: `Camino · Tienes ${pendingTasks.length} tareas pendientes`,
      html: `<p>Hola ${user.name},</p>
             <p>Tienes estas tareas pendientes para hoy:</p>
             <ul>${pendingTasks.map((t) => `<li>${t.title}</li>`).join("")}</ul>
             <p><a href="https://camino-6vx.pages.dev">Abrir Camino</a></p>`,
    }),
  });
}
```

---

## 8. Tabla en Supabase

```sql
-- Ya definida en el esquema principal:
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notification_preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  email_reminders boolean default true,
  push_reminders boolean default true,
  laudes_time text default '07:00',
  angelus_time text default '12:00',
  rosary_time text default '20:00',
  updated_at timestamptz default now()
);
```

---

## 9. Service Worker (`public/sw.js`)

Ya incluido en el proyecto. Escucha eventos `push` y muestra la
notificación nativa del dispositivo.

---

## 10. Verificación

1. Genera las VAPID keys con `npx web-push generate-vapid-keys`.
2. Configura `VITE_VAPID_PUBLIC_KEY` en Cloudflare Pages.
3. Configura `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` como secrets del Worker.
4. Instala `web-push` o implementa el protocolo Web Push en el Worker.
5. Crea los endpoints `/notifications/subscribe` y `/notifications/email/reminders`.
6. Configura el cron del Worker (`0 7 * * *`, `0 12 * * *`, `0 20 * * *`).
7. Crea las tablas `push_subscriptions` y `notification_preferences` en Supabase.
8. En la app, ve a Regla de Vida → "Activar push". Debería funcionar sin el error.

---

## Resumen

| Componente | Valor |
|---|---|
| `VITE_VAPID_PUBLIC_KEY` | Cloudflare Pages → Environment Variables |
| `VAPID_PUBLIC_KEY` | Cloudflare Worker → `wrangler secret put` |
| `VAPID_PRIVATE_KEY` | Cloudflare Worker → `wrangler secret put` |
| `RESEND_API_KEY` | Cloudflare Worker → `wrangler secret put` |
| Tabla push | `push_subscriptions` |
| Tabla email | `notification_preferences` |
| Service Worker | `public/sw.js` |
| Cron | `0 7,12,20 * * *` |
