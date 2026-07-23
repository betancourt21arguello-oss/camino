# 📿 CAMINO — Instructivo de Testeo y Despliegue

Aplicación de Rosario Comunitario Vivo.
Stack: **React + Vite + TypeScript + Tailwind** (frontend), **Supabase** (base de datos + auth + realtime), **Cloudflare Workers + R2 + KV** (motor de contenido y assets), **Gemini API** (motor principal de contenido diario) y **WhatsApp Cloud API** (motor de ingesta de audios).

---

## 1. Arquitectura de motores

| Motor | Rol | Frecuencia |
|-------|-----|-----------|
| **Gemini API** (motor principal) | Genera TODO el contenido litúrgico del día en **1 sola llamada/día** | 1×/día (cron) |
| **WhatsApp Cloud API** (segundo motor) | Ingesta de audios (Laudes, Ángelus, cantos) enviados desde un número admin | Bajo demanda |
| **PrayerEngine** (cliente) | Máquina de estados del Rosario. La UI solo refleja estado | Tiempo real |
| **Sistema de Frutos** (cliente + DB) | Velas 🕯️ / Semillas 🌱 / Agua 💧, desacoplado del Rosario | Por evento |

---

## 2. Testeo local

### Requisitos
- Node 20.19+ (o 22.12+) y npm
- Cuenta de Supabase (plan Free)
- API key de Gemini (Google AI Studio)
- (Opcional) App de WhatsApp Cloud en Meta for Developers

### Pasos
```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno (ver sección 6)
cp .env.example .env.local
# edita .env.local con tus llaves

# 3. Arrancar en desarrollo
npm run dev
# abre http://localhost:5173

# 4. Build de producción (verifica que compila)
npm run build

# 5. Previsualizar el build
npm run preview
```

> **Nota:** El repositorio actual funciona **100% con datos de ejemplo** (`src/liturgy/today.ts`, `src/fruits/store.tsx`). No necesitas ninguna llave para ver la UI. Las llaves solo son necesarias para conectar los motores reales (Gemini/WhatsApp/Supabase).

---

## 3. Despliegue en producción

### Frontend (Cloudflare Pages)
```bash
# Conecta el repo en Cloudflare Pages
Build command:     npm run build
Build output dir:  dist
```
O manual con Wrangler:
```bash
npm i -g wrangler
wrangler pages deploy dist --project-name=camino
```

### Backend (Cloudflare Workers)
Crea un Worker `camino-api` con dos responsabilidades:
1. **Cron diario** → llama a Gemini y cachea el resultado en KV/Supabase.
2. **Webhook de WhatsApp** → recibe audios del admin y los sube a R2.

```bash
wrangler deploy          # despliega el Worker
wrangler r2 bucket create camino-audio
wrangler kv namespace create DAILY_CACHE
```

---

## 4. Configuración de Supabase

### 4.1 Crear proyecto
1. https://supabase.com → New Project (plan Free).
2. Copia `Project URL` y `publishable key` → van al `.env.local` del frontend.
3. Copia el `service_role key` → va **solo** al Worker (nunca al cliente).

### 4.1.1 Supabase Auth (magic link + Google)
1. En `Authentication → URL Configuration`, configura:
   - Site URL local: `http://localhost:5173`
   - Redirect URL local: `http://localhost:5173/**`
   - Site URL producción: `https://tu-dominio.com`
   - Redirect URL producción: `https://tu-dominio.com/**`
2. En `Authentication → Providers → Email`, activa Email y Magic Link.
3. Para Google: crea credenciales OAuth Web en Google Cloud, copia Client ID y
   Secret en `Authentication → Providers → Google` y añade como redirect URI la
   URL callback que muestra Supabase.
4. La app usa `signInWithOtp`, `getSession` y `onAuthStateChange`. No pide
   contraseña. Sin variables de Supabase, se activa un modo de cuenta local para
   poder probar la interfaz; no lo uses como identidad de producción.

### 4.2 Esquema de base de datos
Ejecuta esto en el **SQL Editor** (no uses una sola tabla gigante — separa responsabilidades):

```sql
-- Perfiles vinculados a Supabase Auth.
-- IMPORTANTE: el GardenDNA NUNCA se guarda aquí. Se deriva en el cliente
-- con SHA-256(auth.uid()) cada vez que hace falta (ver sección 8.1). Esto
-- significa que si el usuario entra desde cualquier dispositivo del mundo,
-- reconstruye exactamente el mismo ADN sin que el servidor almacene nada.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  country text,
  created_at timestamptz default now()
);

-- Event sourcing del Jardín Vivo. NUNCA almacena SVG ni geometría, y
-- tampoco almacena el ADN: solo la HISTORIA (lo que el usuario hizo).
create table garden_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  event_type text not null check (event_type in (
    'ROSARY_COMPLETED','COMMUNITY_PRAYER','NOVENA_COMPLETED',
    'CORONILLA_COMPLETED','CANDLE_LIT','SEED_RECEIVED','WATER_RECEIVED',
    'STREAK_MAINTAINED','REFLECTION_COMPLETED','TASK_COMPLETED',
    'SILENCE_TIME','WATER_GARDEN'
  )),
  value int not null default 1,
  intention text,                 -- solo para WATER_GARDEN (metadatos)
  created_at timestamptz default now()
);

-- Riego del Jardín Silvestre. Append-only. Cada riego guarda una intención
-- opcional. NO existe plantación manual: el jardín es 100% automático.
create table garden_waterings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  intention text,                 -- "Familia", "Paz", "Conversión"…
  watered_at timestamptz default now()
);

-- NOTA: se retiraron garden_plantings, garden_lights y la mecánica de aves.
-- El jardín ya no se diseña ni se construye; la vida de oración lo revela.

-- Contenido litúrgico diario generado por Gemini (1 fila/día)
create table daily_liturgy (
  date date primary key,
  weekday text, season text, liturgical_color text,
  saint jsonb, quote jsonb,
  gospel jsonb, psalm jsonb, first_reading jsonb, second_reading jsonb,
  laudes jsonb, reflection text,
  image_url text, marian jsonb,
  generated_at timestamptz default now()
);

-- Devociones (Rosario, Coronillas, Novenas) como JSON — el motor NO las conoce
create table devotions (
  id text primary key,
  title text, subtitle text,
  definition jsonb not null              -- Devotion → Sections → Steps
);

-- Sesiones de oración comunitaria (sala mundial)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  devotion_id text references devotions(id),
  started_at timestamptz default now(),
  status text default 'running'
);

-- Participantes activos (heartbeat para presencia y reasignación de líder)
create table participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  profile_id uuid references profiles(id),
  role text default 'assembly',          -- leader | assembly
  last_seen timestamptz default now(),
  done_for_step boolean default false
);

-- Progreso del Step actual de una sesión (la máquina de estados)
create table progress (
  session_id uuid primary key references sessions(id) on delete cascade,
  flat_index int default 0,
  repeat_index int default 0,
  phase text default 'prayer',           -- prayer | reflection
  updated_at timestamptz default now()
);

-- Velas / intenciones (NO se pueden apagar; duran 24 h)
create table candles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id),
  intention text not null,
  lit_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- Quién reza por qué vela (produce Agua 💧 — caridad)
create table intentions (
  id uuid primary key default gen_random_uuid(),
  candle_id uuid references candles(id) on delete cascade,
  pray_for_id uuid references profiles(id),
  added_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '24 hours')
);

-- Chat efímero (solo existe durante Reflection; se purga al terminar)
create table chat (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  profile_id uuid references profiles(id),
  text text, created_at timestamptz default now()
);

-- Notas de voz (Oratorio personal)
create table voice_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  r2_key text,                            -- vive en Cloudflare R2, no en Supabase
  created_at timestamptz default now()
);

-- REGLA DE VIDA: gestor de compromisos espirituales
create table spiritual_tasks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  title text not null,
  category text not null,                 -- laudes | angelus | rosary | gospel | vespers | custom
  cadence text not null,                  -- daily | weekly
  time text,                              -- "HH:MM" para tareas ancladas
  required boolean default false,         -- Laudes/Ángelus/Rosario NO se pueden borrar
  done boolean default false,
  completed_at timestamptz
);

-- Frutos espirituales (balance por usuario) — desacoplado del Rosario
create table fruits (
  profile_id uuid primary key references profiles(id),
  vela int default 0, semilla int default 0, agua int default 0,
  updated_at timestamptz default now()
);

-- Historial espiritual (transparente, sin azar)
create table fruit_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  note text, fruits jsonb, at timestamptz default now()
);

-- Assets de WhatsApp. El tag determina automáticamente dónde aparecen.
create table assets (
  id uuid primary key default gen_random_uuid(),
  tag text not null check (tag in (
    'laudes','angelus','evangelio','salmo','reflexion','canto'
  )),
  title text not null,
  author text,
  duration_seconds int,
  r2_key text not null,
  public_url text,                         -- URL firmada o pública servida por Worker
  uploaded_by text,
  status text default 'published',
  created_at timestamptz default now()
);
```

### 4.2.1 RLS mínimo
Activa RLS en todas las tablas con datos de usuario. Políticas esenciales:
- `profiles`, `spiritual_tasks`, `fruits`, `garden_events`, `voice_notes`: el
  usuario solo lee/escribe filas donde `auth.uid() = user_id` (o `id` en profiles).
- `garden_events`, `garden_waterings`: **solo INSERT y SELECT** de sus
  propias filas (`auth.uid() = user_id`). Append-only: la historia nunca se
  edita ni se borra.
- `candles`: lectura pública autenticada; inserción solo con `owner_id = auth.uid()`;
  **sin política UPDATE/DELETE para usuarios**, de modo que nadie pueda apagarla.
- `intentions`: cada usuario inserta/lee las propias; la vela referenciada sigue
  siendo comunitaria.
- `assets` y `daily_liturgy`: lectura pública; escritura solo con `service_role`
  desde el Worker.
- `participants`, `progress`, `chat`: lectura de la sesión activa y escritura
  limitada al participante autenticado.

### 4.3 Realtime
Activa **Realtime** en las tablas `participants`, `progress`, `chat` y `candles`:
`Database → Replication → habilitar` para difusión (broadcast) de presencia y estado.

### 4.4 Cron diario de Laudes/Ángelus/Rosario
Programa (Supabase → Database → Cron, o el Worker) la **inserción automática** de las tareas obligatorias en `spiritual_tasks` para cada usuario cada día:
- `Laudes` a las 07:00 (required)
- `Ángelus` a las 12:00 (required)
- `Rosario` a las 20:00 (required · mínimo 1/día)

---

## 5. Motor principal: Gemini API

**Objetivo:** 1 llamada al día que rellene el contenido litúrgico completo.

### 5.1 API key
Google AI Studio → *Get API key* → guárdala como `GEMINI_API_KEY` (solo en el Worker).

### 5.2 Worker `daily-generate` (pseudocódigo)
```ts
// Cron: 0 4 * * *  (04:00 UTC)
export default {
  async scheduled(_e, env) {
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `
Eres un asistente litúrgico católico. Devuelve SOLO JSON válido con esta forma:
{ "date","weekday","season","liturgicalColor",
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

    // 1) Texto litúrgico
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        }) }
    );
    const data = await res.json();
    const liturgy = JSON.parse(data.candidates[0].content.parts[0].text);

    // 2) Imagen del día (Gemini/Imagen o servicio de imágenes) → sube a R2
    const imageUrl = await generateAndStoreImage(liturgy.imagePrompt, env);
    liturgy.imageUrl = imageUrl;

    // 3) Cachear en KV + Supabase (upsert por fecha)
    await env.DAILY_CACHE.put(today, JSON.stringify(liturgy), { expirationTtl: 172800 });
    await supabaseUpsert(env, "daily_liturgy", { date: today, ...liturgy });
  }
}
```

### 5.3 Consumo desde el frontend
`GET /api/daily` → devuelve la fila de `daily_liturgy` (o el KV). El frontend
lo mapea a `DailyLiturgy` (`src/liturgy/types.ts`). Hoy usa el mock
`src/liturgy/today.ts`; solo hay que sustituir la fuente por el `fetch`.

> **Regla de oro:** el modelo se llama **una vez** y se cachea. Ningún cliente
> llama a Gemini directamente.

---

## 6. Segundo motor: WhatsApp Cloud API (ingesta de audios)

**Objetivo:** el admin envía un audio por WhatsApp y el tag lo coloca
automáticamente en la dashboard y en su portal correcto.

Formato de caption recomendado:
```text
#angelus | Padre José | Ángelus del mediodía
#laudes | Monasterio Santa María | Laudes cantados del martes
#evangelio | Padre Carlos | Evangelio leído por el Padre Carlos
#reflexion | Hna. Teresa | Pertenecer a la familia de Jesús
```
Tags permitidos: `laudes`, `angelus`, `evangelio`, `salmo`, `reflexion`, `canto`.
Un asset con tag `laudes` aparece en el botón y portal de Laudes; `angelus` en
Ángelus; `evangelio` como lectura de audio separada; `reflexion` en su apartado
propio. Todo asset publicado también aparece en “Acompañamiento recibido hoy”.

### 6.1 Configuración en Meta
1. https://developers.facebook.com → crea App → añade **WhatsApp**.
2. Obtén: `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`, `WABA_ID` y define un
   `VERIFY_TOKEN` propio.
3. Configura el **Webhook** apuntando a tu Worker:
   `https://camino-api.tudominio.workers.dev/whatsapp` y suscríbete a `messages`.

### 6.2 Webhook en el Worker (pseudocódigo)
```ts
// GET /whatsapp  → verificación
if (mode === "subscribe" && token === env.VERIFY_TOKEN) return new Response(challenge);

// POST /whatsapp → mensaje entrante
const msg = body.entry[0].changes[0].value.messages?.[0];
const from = msg.from;

// Solo aceptar del número admin
if (from !== env.ADMIN_PHONE) return new Response("ignored");

if (msg.type === "audio") {
  // 1) Descargar el media por su id
  const mediaId = msg.audio.id;
  const meta = await fetch(`https://graph.facebook.com/v20.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` } }).then(r=>r.json());
  const audio = await fetch(meta.url,
    { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` } });

  // 2) Normalizar: "#tag | Autor | Título"
  const allowed = new Set(["laudes","angelus","evangelio","salmo","reflexion","canto"]);
  const [rawTag, author = "Comunidad Camino", title = "Audio del día"] =
    (msg.audio.caption || "#canto").split("|").map(s => s.trim());
  const tag = rawTag.toLowerCase().replace(/^#/, "");
  if (!allowed.has(tag)) return new Response("invalid tag", { status: 400 });

  // 3) Subir a R2 y registrar en Supabase
  const key = `audio/${tag}/${Date.now()}.ogg`;
  await env.CAMINO_AUDIO.put(key, audio.body);
  await supabaseInsert(env, "assets", {
    tag, author, title, r2_key: key, uploaded_by: from, status: "published"
  });
}
```

### 6.3 Uso en la app
El frontend consulta `assets where status = 'published'` y se suscribe a INSERT
por Supabase Realtime. `tag` es el router de contenido; no se necesita publicar
una nueva versión del frontend. La música/audio vive **en R2**, nunca en
Supabase Storage. `src/media/registry.ts` es el mock local del mismo contrato.

---

## 7. Variables de entorno (`.env.example`)

### Frontend (`.env.local`)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_BASE=https://camino-api.tudominio.workers.dev
```

### Worker (`wrangler.toml` → [vars] / secrets)
```
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE=...        # secreto
GEMINI_API_KEY=...               # secreto
WHATSAPP_TOKEN=...               # secreto
PHONE_NUMBER_ID=...
VERIFY_TOKEN=...
ADMIN_PHONE=52155XXXXXXXX        # número admin autorizado
```
Sube secretos con: `wrangler secret put GEMINI_API_KEY` (etc.).

---

## 8. Sistema de Frutos Espirituales (resumen técnico)

> NO es gamificación. Sin XP, monedas, niveles, cofres, ruletas ni azar.

| Fruto | Significado | Se obtiene por | Uso |
|-------|-------------|----------------|-----|
| 🕯️ **Vela** | Una intención ofrecida (24 h) | Completar Rosario/Coronilla/Novena, racha, comunitario | Aparece en Comunidad, Rosario, SVG y jardín |
| 🌱 **Semilla** | Crecimiento espiritual | Perseverancia, hábitos, reflexión | Hace crecer el Jardín SVG |
| 💧 **Agua** | Caridad | Rezar por los demás, intenciones comunitarias | Riega el jardín para que florezca |

- Lógica en `src/fruits/` — **desacoplada** del Rosario. Los motores emiten
  `SpiritualEvent` y el store aplica la recompensa (tabla transparente en
  `rewards.ts`).
- **Velas encendidas no se apagan.** Otros usuarios pueden **rezar por ellas**;
  eso añade la intención a su lista por 24 h y produce Agua.
- Al entrar al Rosario Comunitario, “Rezas por” muestra las intenciones activas
  de **toda la sala**, no solo las del usuario actual.
- El **Jardín SVG** es procedural (nunca imágenes/Canvas) y nunca tiene estado
  final. Aporta únicamente una **firma visual** al Árbol Comunitario.
- **Sin rankings, sin comparaciones, sin tablas de líderes.**

Para añadir un nuevo fruto en el futuro: agrega una entrada en `FRUITS`
(`src/fruits/types.ts`) y su recompensa en `REWARD_TABLE` (`rewards.ts`). Nada
más cambia.

### 8.1 Jardín Vivo: tres capas — ADN, Historia y Estado

**No existe un `GardenSeed` aleatorio.** El jardín se construye a partir de
tres capas estrictamente separadas:

| Capa | Nombre | ¿Cambia? | ¿Dónde vive? |
|------|--------|----------|--------------|
| Identidad | `GardenDNA` / `DnaTraits` | **Nunca** | Se deriva en el cliente, no se guarda |
| Historia | `GardenEvents` | Solo crece (append-only) | `garden_events`, `garden_plantings`, `garden_waterings`, `garden_lights` |
| Estado | `GardenState` | Se recalcula siempre | En memoria, agregado a partir de la Historia |

**GardenDNA (identidad, permanente):**
- `src/garden/dna.ts` → `computeDna(identity)` calcula
  `SHA256(auth.uid ?? id_anónimo_persistido)` con la Web Crypto API. Esto
  produce un hash hexadecimal de 64 caracteres: **ese hash ES el ADN**. Nunca
  se genera con `Math.random()` ni con un número aleatorio.
- `deriveDnaTraits(dna)` convierte segmentos fijos del hash en rasgos
  legibles: tipo de terreno (bosque/pradera/colina/monástico/mediterráneo),
  forma del sendero (recto/curvo/espiral/cruz/círculo), especie del árbol
  central (olivo/cedro/ciprés/roble/sauce), patrón de piedras, curvatura del
  río y paleta de color.
- **El GardenDNA NUNCA se almacena explícitamente.** No existe una columna
  `garden_dna` en `profiles`. Como `auth.uid()` ya es estable, el ADN se
  recalcula en el cliente cada vez que hace falta — 0 bytes adicionales en
  Supabase. Si mañana se cambia el algoritmo generativo, todo el mundo
  conserva su identidad exacta y solo mejora la representación artística.
- El progreso espiritual **jamás** modifica el ADN.

**GardenEvents (historia, solo crece):**
- `src/garden/events.ts` mantiene el registro de eventos
  (`ROSARY_COMPLETED`, `NOVENA_COMPLETED`, `CORONILLA_COMPLETED`,
  `COMMUNITY_PRAYER`, `STREAK_MAINTAINED`, etc.).
- `src/garden/orchard.ts` añade tres tipos de historia manual: qué se
  plantó (`garden_plantings`), cuándo se regó (`garden_waterings`) y qué luz
  se encendió (`garden_lights`) — todas **insert-only**.

**GardenState (agregado mutable):**
- `aggregateGardenState(events, activeCandles)` recorre los eventos y
  produce un objeto plano (`streak`, `rosaries`, `coronillas`, `novenas`,
  `waterLevel`, `lightLevel`, `birdCount`…). Nunca se persiste tal cual;
  se recalcula siempre a partir de la Historia.

**Generación del SVG — cliente, 100 % determinista:**
```
GardenDNA (identidad)  +  GardenState (agregado)  →  GardenGenerator  →  SVG
```
- PRNG determinista: `src/garden/prng.ts` (FNV-1a + Mulberry32). **Nunca
  `Math.random()`.**
- Geometría pura en `src/garden/model.ts`: noise 1D, trigonometría, Bezier y
  un L-system para las ramas.
- **Árbol Central único:** `buildCentralTree` genera la estructura de ramas
  COMPLETA una sola vez (profundidad fija, seed = solo ADN). El "crecimiento"
  nunca añade ramas nuevas al azar: simplemente **revela un prefijo mayor**
  de esa misma lista ya determinista a medida que crece
  `rosarios + coronillas + novenas + oración comunitaria + racha`. Por eso
  el árbol de un usuario con 5 años de historia no tiene 5 árboles: tiene
  el mismo árbol, más grande, con más de sus propias ramas visibles.
- **Mapeo automático (100% del estado, sin diseño manual):** Coronillas →
  luces nocturnas y flores blancas; Novenas → piedras en el sendero;
  Silencio + **saldo de semillas (pasivo)** → densidad de vegetación/hierba
  en la base; caridad/agua → río visible y mariposas. Dos usuarios con el
  mismo número de Rosarios pueden tener jardines distintos según a qué
  dedicaron su tiempo: el jardín es una biografía, no un nivel.
- **El usuario NO planta ni diseña.** Se eliminó el "Huerto Devocional"
  interactivo (arrastrar/soltar, cesta, slots) y la mecánica de aves. La
  única acción manual es **💧 Regar mi jardín** (consume 1 agua, guarda una
  intención en `WATER_GARDEN`, dispara lluvia suave + aura). No otorga puntos.
- Render cliente memoizado: `src/garden/GardenSvg.tsx` (único motor visual).
- El SVG **nunca** se envía a una IA, nunca se guarda en Supabase Storage y
  nunca se sube a R2. Solo se guardan datos (ADN derivado en el cliente +
  eventos), nunca imágenes ni geometría.
- `GardenSignature` (la firma que viaja al Rosario) depende **solo** del
  ADN, nunca del estado — es identidad, no progreso. `CommunityTree.tsx`
  combina firmas ajenas; nunca recibe jardines completos.

### 8.2 Obra Comunitaria del Rosario (SVG vivo)

Durante el Rosario Comunitario **no se envía el jardín completo**. Cada
participante publica únicamente su `GardenSignature` compacta
(`CommunitySignaturePayload`, < 100 bytes):

```ts
{ session_id, signature_seed, primary_shape, palette, country_color, growth_factor }
```

- Al inicio de la sesión la obra está **vacía**: solo una tenue luz ✨.
- Cada 🙏 no suma un punto: aporta la firma del usuario, que viaja como
  partícula de luz y se integra en el SVG.
- El progreso **no avanza por el tiempo**. Avanza porque la comunidad responde.
- La geometría completa de la obra se genera de una vez de forma
  determinista (`buildCommunityParticles`). El crecimiento solo REVELA un
  prefijo mayor de esa lista — nunca reordena ni inventa formas nuevas.
- La composición (Manto, Rosa Mística, Rosario, Paloma, Estrella del Mar,
  Monograma Mariano) se elige con una `CommunitySeed` global derivada de las
  firmas + el tiempo litúrgico. Dos Rosarios distintos nunca producen la
  misma obra.
- Al completar: transición lenta, nombre automático de la obra
  ("Rosa de la Esperanza", "Manto de Consolación"…), estadísticas y
  persistencia de **solo la semilla** en la Galería de Oración
  (`localStorage` hoy; tabla `community_works` en producción).
- La Galería reconstruye cada obra en el navegador. Nunca se guarda SVG,
  imagen ni geometría. Free-tier friendly: kilobytes, no megabytes.

Archivos clave:
- `src/community/types.ts` — payload y CommunityWorkSeed
- `src/community/composition.ts` — siluetas + elección litúrgica
- `src/community/CommunityWorkSvg.tsx` — SVG vivo
- `src/community/useCommunityWork.ts` — progreso por 🙏
- `src/community/gallery.ts` + `src/screens/GalleryScreen.tsx` — museo vivo

### 8.3 Jardín Silvestre automático + único ritual (Regar)

**Filosofía:** el usuario no diseña ni construye su jardín. Su vida de
oración **revela** progresivamente un jardín único ya contenido en su
GardenDNA. El crecimiento es 100% automático y derivado del historial
(`GardenEvents` → `GardenState`).

- **Sin plantación manual.** Eliminados `OrchardSvg.tsx`, `BasketPanel.tsx`,
  `orchard.ts`, la mecánica de aves (`FaunaBird`, `BIRD_FED`,
  `totalBirdsFed`) y todo estado de slots/arrastrar/soltar.
- **Semillas pasivas:** el saldo de semillas se mapea a la densidad de
  vegetación base (hierba y flores silvestres del suelo) en `GardenSvg.tsx`.
- **Único botón manual:** *💧 Regar mi jardín (Requiere 1💧)*. Pide una
  intención (Familia, Paz, Conversión…) que se guarda en el evento
  `WATER_GARDEN` (`meta.intention`) y dispara un efecto visual (lluvia suave
  + aura temporal). No da puntos.

**Perfil por pestañas** (`src/screens/PerfilScreen.tsx`), sin scroll infinito:
- `🌳 Mi Jardín` (por defecto): SVG con pastilla mínima de ADN superpuesta
  (hash truncado + rasgos), texto breve, botón de regar, grid compacto de
  6 stats (Rosarios, Coronillas, Novenas, Agua, Semillas, Velas) e Historia
  Viva en acordeón (agrupa eventos del mismo tipo/día para evitar spam).
- `🕯️ Intenciones`: intenciones que acompañas · 24 h.
- `🎙️ Oratorio`: notas de voz.
- Transiciones entre pestañas con `framer-motion`. La pestaña Mi Jardín cabe
  en ~100vh de un teléfono estándar.

### 8.4 Rosario Activo: layout sin scroll + navbar de acción + voz

Pantalla `src/screens/rosario/LiveSession.tsx`, reescrita con
`h-[100dvh] flex flex-col overflow-hidden`:
- **Top Bar compacta** (`h-12`): fusiona "personas en vivo" + "intenciones"
  + toggle de micrófono.
- **Tarjeta central consolidada:** Guía (texto atenuado) + Asamblea (texto
  destacado/bold) en un solo contenedor; **solo esa tarjeta** tiene
  `overflow-y-auto` cuando el texto es largo.
- **PrayerNavBar** (`src/screens/rosario/PrayerNavBar.tsx`): el ítem central
  "Rosario" se convierte en un botón 🙏 grande que sobresale (`absolute -top-8`)
  con anillo de progreso de consenso en el borde y los gestos
  `onPointerDown`/`onPointerUp`. La navbar global de la app se oculta durante
  la oración (`onActiveChange` → `prayerActive` en `App.tsx`).
- **Autoplay por voz (Web Speech API):** `usePrayerVoiceControl(keywords,
  onComplete)` en `src/engine/usePrayerVoiceControl.ts`. Usa
  `SpeechRecognition`/`webkitSpeechRecognition` con `continuous = true` e
  `interimResults = true`, en `es-ES`. `matchKeywords` valida si el texto
  transcrito cubre ≥60% de las palabras clave del paso (extraídas con
  `keywordsForStep`). Si valida, avanza el rosario y reinicia el reconocedor
  para el siguiente paso. Maneja el caso de navegador sin soporte (el toggle
  no se muestra) y permiso de micrófono denegado.

---

## 9. Checklist de puesta en marcha

- [ ] Proyecto Supabase creado y esquema SQL aplicado (sección 4.2)
- [ ] Site URL, redirect URLs, Email Magic Link y Google Provider configurados
- [ ] RLS activo, especialmente candles y garden_events/garden_waterings sin UPDATE/DELETE
- [ ] Confirmado que NO existe columna `garden_dna`: el ADN se deriva en el
      cliente vía SHA-256(auth.uid()) (sección 8.1)
- [ ] Realtime habilitado en `participants`, `progress`, `chat`, `candles`
- [ ] Realtime habilitado en `assets` para que cada upload aparezca sin recargar
- [ ] Cron diario que inserta Laudes/Ángelus/Rosario en `spiritual_tasks`
- [ ] Worker `daily-generate` con `GEMINI_API_KEY` y cron 1×/día
- [ ] Bucket R2 `camino-audio` + Webhook de WhatsApp verificado
- [ ] `ADMIN_PHONE` configurado (solo ese número puede subir audios)
- [ ] Frontend desplegado en Cloudflare Pages apuntando a `VITE_API_BASE`
- [ ] `GET /api/daily` devolviendo la liturgia del día
