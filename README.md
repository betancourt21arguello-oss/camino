# 📿 CAMINO — Rosario Comunitario Vivo

Aplicación con motor de contenido litúrgico diario, Rosario comunitario en tiempo real, Jardín SVG procedural y sistema de frutos espirituales (velas, semillas, agua).

## Stack

- **Frontend:** React + Vite + TypeScript + Tailwind
- **Backend:** Cloudflare Workers + R2 + KV
- **Base de datos / Auth:** Supabase + Realtime
- **Motores:** Gemini API (contenido diario), WhatsApp Cloud API (ingesta de audios)

## Repositorio remoto

`https://github.com/betancourt21arguello-oss/camino.git`

## Scripts

```bash
npm install
cp .env.example .env.local
npm run dev
npm run build
npm run preview
```

## Variables de entorno

Frontend (`.env.local` / Cloudflare Pages Environment variables):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
VITE_API_BASE=https://camino-api.byp.workers.dev
VITE_FRONTEND_URL=https://camino-6vx.pages.dev
```

Worker (`wrangler.toml` / secrets):

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...
GEMINI_API_KEY=...
WHATSAPP_TOKEN=...
PHONE_NUMBER_ID=...
VERIFY_TOKEN=...
ADMIN_PHONE=...
```

Se recomienda subir secretos con `wrangler secret put`.

> Nota: en Cloudflare Pages las variables `VITE_*` se inyectan en build time. Si cambiás cualquiera, hacé un nuevo deploy de Pages.

## Esquema de base de datos

Ejecuta el script SQL del archivo `supabase-verify.sql` en el SQL Editor de Supabase. Incluye tablas, RPCs, RLS y realtime.

Habilita **Realtime** en:
`participants`, `progress`, `chat`, `candles`, `assets`, `daily_prayer_presence`, `spiritual_tasks`, `sessions`, `fruits`, `garden_events`.

## Configuración de Supabase Auth

1. **Supabase → Authentication → URL Configuration**
   - `Site URL`: `https://camino-6vx.pages.dev`
   - `Redirect URLs`:
     - `https://camino-6vx.pages.dev/**`
     - `http://localhost:5173/**`
     - `capacitor://localhost/**`
     - `ionic://localhost/**`

2. **Providers**
   - Email / Magic Link: habilitados
   - Google OAuth: configurar credenciales y activar el provider

### Si ves `Supabase Auth no está configurado`

Ese mensaje no es de Supabase Auth; es de la app detectando que faltan las variables `VITE_SUPABASE_URL` y/o `VITE_SUPABASE_PUBLISHABLE_KEY` en el build de Cloudflare Pages. Revisá que estén seteadas en **Pages → Settings → Environment variables**, y redeployeá.

## Despliegue

- Frontend en **Cloudflare Pages** (`dist` como build output).
- Worker `camino-api` para cron diario, webhook de WhatsApp y caché.
- Bucket R2 `camino-audio` y KV `DAILY_CACHE`.

## Nota

La app funciona 100% con datos de ejemplo (`src/liturgy/today.ts`, `src/media/registry.ts`, `src/fruits/store.tsx`) sin necesidad de llaves. Las credenciales reales habilitan motores vivos y persistencia.

## Archivos auxiliares

- `migration.md` — Cómo convertir la app en APK/IPA con Capacitor.
- `config.md` — Configuraciones manuales paso a paso.
- `supabase-verify.sql` — Verificación completa del esquema en Supabase.
