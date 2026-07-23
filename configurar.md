# ⚙️ Guía de Configuración y Pendientes: Gemini, WhatsApp y Cronjob

Este documento explica exactamente dónde van las llaves del API de Gemini, la configuración de WhatsApp Cloud API, el Cronjob diario y detalla todo lo que falta por implementar y desplegar en el proyecto **CAMINO**.

---

## 1. Dónde se configura la Gemini API (`GEMINI_API_KEY`)

> **Importante:** La API Key de Gemini **NUNCA** se guarda en el frontend de React (`.env.local`). Debe vivir de forma privada en el **Cloudflare Worker** (`camino-api`).

### Pasos para configurarla:
1. Obtén tu API key en [Google AI Studio](https://aistudio.google.com/).
2. Si utilizas el CLI de Cloudflare Wrangler en tu terminal:
   ```bash
   wrangler secret put GEMINI_API_KEY
   ```
   (Ingresa el valor de la clave cuando el terminal lo pida).
3. O desde el Dashboard web de Cloudflare:
   - Ve a **Workers & Pages** → `camino-api` → **Settings** → **Variables and Secrets**.
   - Añade una variable de tipo **Secret** llamada `GEMINI_API_KEY`.

---

## 2. Dónde se configura WhatsApp Cloud API

> Tampoco vive en el frontend. Toda la integración de WhatsApp se configura entre **Meta for Developers** y el **Cloudflare Worker**.

### A. En Meta for Developers (https://developers.facebook.com)
1. Crea una App de tipo **Business** y añade el producto **WhatsApp**.
2. En la sección **WhatsApp → API Setup**, obtén:
   - `WHATSAPP_TOKEN` (Permanent / System User Token).
   - `PHONE_NUMBER_ID` (ID del número desde el que se reciben los mensajes).
   - `WABA_ID` (WhatsApp Business Account ID).
3. En la sección **WhatsApp → Configuration (Webhooks)**:
   - **Callback URL**: `https://camino-api.<tu-subdominio>.workers.dev/whatsapp`
   - **Verify Token**: Un token secreto inventado por ti (ej. `camino_verify_token_2026`).
   - Suscríbete al evento `messages`.

### B. En el Cloudflare Worker (`camino-api`)
Guarda las variables y secretos mediante `wrangler`:
```bash
# Variables públicas/normales (en wrangler.toml):
PHONE_NUMBER_ID = "..."
VERIFY_TOKEN = "camino_verify_token_2026"

# Secretos cifrados:
wrangler secret put WHATSAPP_TOKEN
wrangler secret put ADMIN_PHONE        # Ej: 52155XXXXXXXX (Número autorizados para enviar audios)
```

---

## 3. Dónde y cómo se configura el Cronjob diario (Gemini)

El cronjob se ejecuta automáticamente a nivel de infraestructura para llamar a Gemini 1 vez al día (por ejemplo a las 04:00 UTC) antes de que empiece la jornada comunitaria.

### A. Configuración en `wrangler.toml` del Worker:
```toml
name = "camino-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["0 4 * * *"]   # Se dispara todos los días a las 04:00 UTC

[[kv_namespaces]]
binding = "DAILY_CACHE"
id = "<tu_kv_namespace_id>"

[[r2_buckets]]
binding = "CAMINO_AUDIO"
bucket_name = "camino-audio"
```

### B. Alternativa desde Supabase (pg_cron):
Si prefieres que Supabase dispare la generación, puedes activar la extensión `pg_cron` en Supabase Dashboard → **Database → Extensions** y programar un HTTP POST que invoque la URL del Worker.

---

## 4. Análisis completo de lo que falta por configurar / implementar

Actualmente el repositorio cuenta con el **Frontend en React + Vite completo** funcionando con datos de prueba (mocks). Para pasar a producción 100% real, falta configurar lo siguiente:

### 📑 Checklist de Pendientes por Módulo

#### 1. Backend: Código del Worker de Cloudflare (`camino-api`)
- [ ] **Crear la carpeta del Worker** (ej. `worker/` o repo separado `camino-api`).
- [ ] **Implementar el handler `scheduled` (Cron Trigger)**:
  - Llama a Gemini API (`gemini-1.5-flash`).
  - Procesa la respuesta JSON litúrgica del día.
  - Guarda el resultado en KV (`DAILY_CACHE`) y realiza un `upsert` en la tabla `daily_liturgy` de Supabase.
- [ ] **Implementar los endpoints HTTP**:
  - `GET /api/daily`: Devuelve la liturgia del día desde KV/Supabase.
  - `GET /whatsapp`: Responde al reto de verificación (`hub.challenge`) de Meta.
  - `POST /whatsapp`: Recibe webhooks con audios enviadas por `ADMIN_PHONE`, sube el archivo `.ogg` a Cloudflare R2 (`camino-audio`) e inserta la fila en la tabla `assets` de Supabase.

#### 2. Servicios de Infraestructura (Cloudflare)
- [ ] **Crear Bucket R2**: `wrangler r2 bucket create camino-audio`
- [ ] **Crear KV Namespace**: `wrangler kv namespace create DAILY_CACHE`
- [ ] **Desplegar el Worker**: `wrangler deploy`

#### 3. Base de Datos (Supabase Dashboard)
- [ ] **Realtime**: Habilitar replicación en las tablas `participants`, `progress`, `chat`, `candles` y `assets`.
- [ ] **Auth**:
  - Configurar las URLs de redirección (`http://localhost:5173/**` y la URL final de producción).
  - Activar Magic Link en Email Provider.
  - (Opcional) Configurar Client ID y Client Secret de Google OAuth.
- [ ] **Cron en Supabase (Opcional para Tareas Espirituales)**:
  - Inserción diaria de tareas requeridas (`Laudes`, `Ángelus`, `Rosario`) en `spiritual_tasks`.

#### 4. Frontend (`.env.local`)
- [ ] Actualizar `VITE_API_BASE` en `.env.local` apuntando al dominio publicado de tu Worker (ej. `https://camino-api.tudominio.workers.dev`).
