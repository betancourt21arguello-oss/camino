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

Frontend (`.env.local`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
VITE_API_BASE=https://camino-api.example.workers.dev
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

## Esquema de base de datos

Ejecuta el script SQL del instructivo (`instructivo.md` / sección 4.2) en el SQL Editor de Supabase. Incluye tablas como `profiles`, `garden_events`, `garden_waterings`, `daily_liturgy`, `devotions`, `sessions`, `participants`, `progress`, `candles`, `intentions`, `chat`, `voice_notes`, `spiritual_tasks`, `fruits`, `fruit_history` y `assets`.

Habilita **Realtime** en `participants`, `progress`, `chat`, `candles` y `assets`.

Una vez aplicado el esquema, define en Supabase Auth:
- `Site URL`: `http://localhost:5173`
- `Redirect URLs`: `http://localhost:5173/**`

## Despliegue

- Frontend en **Cloudflare Pages** (`dist` como `build output`).
- Worker `camino-api` para cron diario, webhook de WhatsApp y caché.
- Bucket R2 `camino-audio` y KV `DAILY_CACHE`.

## Nota

La app funciona 100% con datos de ejemplo (`src/liturgy/today.ts`, `src/media/registry.ts`, `src/fruits/store.tsx`) sin necesidad de llaves. Las credenciales reales habilitan motores vivos y persistencia.
