# Configuración manual — Camino

Este archivo documenta TODO lo que hay que configurar a mano en servicios externos para que la app funcione en producción.

## 1. Variables de entorno (Cloudflare Pages)

En Cloudflare Pages → tu proyecto `camino` → **Settings → Environment variables**:

| Variable | Valor | Obligatoria |
|----------|-------|-------------|
| `VITE_SUPABASE_URL` | `https://TU-PROYECTO.supabase.co` | Sí |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Sí |
| `VITE_API_BASE` | `https://camino-api.byp.workers.dev` | Sí |
| `VITE_FRONTEND_URL` | `https://camino-6vx.pages.dev` | Sí |
| `VITE_VAPID_PUBLIC_KEY` | clave pública VAPID para push | Opcional |

> Importante: estas variables se inyectan en build time. Después de cambiar cualquiera, hacé un nuevo deploy de Pages.

## 2. Variables de entorno (Worker)

En el Worker `camino-api` usá `wrangler secret put` para las credenciales sensibles:

```bash
cd worker
wrangler secret put SUPABASE_SERVICE_ROLE
wrangler secret put GEMINI_API_KEY
wrangler secret put WHATSAPP_TOKEN
wrangler secret put PHONE_NUMBER_ID
wrangler secret put VERIFY_TOKEN
wrangler secret put ADMIN_PHONE
```

Y en `wrangler.toml` van las no sensibles:

```toml
[vars]
SUPABASE_URL = "https://TU-PROYECTO.supabase.co"
```

## 3. Supabase Auth

### 3.1 Redirect URLs (IMPRESCINDIBLE)

Sin esto, el login con magic link o Google falla con CORS/redirect inválido.

1. Ir a **Supabase dashboard** → **Authentication** → **URL Configuration**
2. **Site URL**: `https://camino-6vx.pages.dev`
3. **Redirect URLs** (agregar todas):
   - `https://camino-6vx.pages.dev/**`
   - `http://localhost:5173/**` (para desarrollo)
   - `capacitor://localhost/**` (si empaquetás para móvil)
   - `ionic://localhost/**` (si empaquetás para iOS)

### 3.2 Proveedores habilitados

**Email (Magic Link)**:
- Authentication → Providers → Email
- Habilitar **Email** y **Magic Link**
- No hace falta habilitar “Email OTP” a menos que lo uses explícitamente

**Google OAuth**:
1. Ir a Google Cloud Console → APIs y servicios → Credenciales
2. Crear credenciales OAuth 2.0 (tipo Web application)
3. Orígenes autorizados: `https://TU-PROYECTO.supabase.co`
4. URIs de redireccionamiento autorizados: la URL que muestra Supabase (generalmente `https://TU-PROYECTO.supabase.co/auth/v1/callback`)
5. Copiar Client ID y Client Secret a Supabase → Authentication → Providers → Google

### 3.3 Debug de Auth fallida

El mensaje `Supabase Auth no está configurado` sale cuando `VITE_SUPABASE_URL` o `VITE_SUPABASE_PUBLISHABLE_KEY` no están definidas en el build de Pages. Para verificar:

```bash
# En DevTools del browser, buscar estas variables:
import.meta.env.VITE_SUPABASE_URL
import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
```

Si devuelven `undefined`, volvé a Cloudflare Pages → Settings → Environment variables y redeployeá.

## 4. Esquema de base de datos

Ejecutar el script SQL completo en el **SQL Editor** de Supabase. Incluye:
- Tablas
- RPCs
- RLS
- Realtime

Archivo: `supabase-verify.sql`

## 5. Realtime en Supabase

Habilitar Realtime en estas tablas:
- `participants`
- `progress`
- `chat`
- `candles`
- `assets`
- `daily_prayer_presence`
- `spiritual_tasks`
- `sessions`

Ruta en Supabase: **Database → Replication → habilitar publicación de cada tabla.**

## 6. WhatsApp Cloud API

### 6.1 Crear app en Meta

1. Ir a https://developers.facebook.com → **My Apps** → **Create App**
2. Tipo: **Business**
3. Agregar producto **WhatsApp**
4. En **WhatsApp → Configuration**:
   - Copiar `Phone Number ID`
   - Copiar `WhatsApp Business Account ID` (no lo usa el código actual, pero guardalo)
   - Generar **Temporary Access Token** o crear un **System User** con token permanente

### 6.2 Configurar Webhook

En **Webhook** → **Edit**:

- **Webhook URL**: `https://camino-api.byp.workers.dev/whatsapp`
- **Verify Token**: elegí un string cualquiera (ej: `camino-secret-2026`) y ponelo en `VERIFY_TOKEN` del Worker
- **Suscríbete a**: `messages`

Meta hará una verificación GET a `/whatsapp?hub.mode=subscribe&hub.verify_token=...&hub.challenge=...`. El Worker debe devolver el `challenge`.

### 6.3 Número admin

Solo el número guardado en `ADMIN_PHONE` puede enviar audios. Formato:
- Argentina: `54911XXXXXXXX`
- España: `34XXXXXXXXX`
- etc.

Ejemplo:
```
ADMIN_PHONE=549291154609876
```

### 6.4 Caption para audios

Formato obligatorio al enviar audio por WhatsApp:
```
#laudes | Monasterio Santa María | Laudes cantados del martes
```

Tags válidos: `laudes`, `angelus`, `evangelio`, `salmo`, `reflexion`, `canto`.

## 7. Cron diario (Gemini)

Ya está configurado en `wrangler.toml`:
```
[triggers]
crons = ["0 8 * * *"]
```

Esto ejecuta `scheduled()` en el Worker todos los días a las 08:00 UTC. El frontend consulta `/daily` y recibe contenido cacheado o generado al vuelo.

## 8. Verificación rápida

```bash
# 1. ¿El Worker responde?
curl -i "https://camino-api.byp.workers.dev/daily?date=2026-07-23"

# 2. ¿CORS OK desde el front?
curl -i -H "Origin: https://camino-6vx.pages.dev" "https://camino-api.byp.workers.dev/daily?date=2026-07-23"

# 3. ¿Supabase Auth tiene las redirect URLs correctas?
# Revisar en dashboard → Authentication → URL Configuration

# 4. ¿El build de Pages tiene las variables?
# Cloudflare Pages → Settings → Environment variables
# Hacer un nuevo deploy después de cualquier cambio.
