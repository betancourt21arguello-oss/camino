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

> **Nota:** los datos mock fueron retirados. El contenido diario llega desde
> `https://camino-api.byp.workers.dev/daily`, los assets desde Supabase/R2 y
> el estado espiritual desde tablas reales o estado vacío inicial.

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

### 4.1.1 Supabase Auth (social login + magic link)
1. En `Authentication → URL Configuration`, configura:
   - Site URL local: `http://localhost:5173`
   - Redirect URL local: `http://localhost:5173/**`
   - Site URL producción: `https://camino-6vx.pages.dev`
   - Redirect URL producción: `https://camino-6vx.pages.dev/**`
2. En `Authentication → Providers → Email`, activa Email y Magic Link.
3. Activa proveedores sociales en Supabase: Google, Apple y Facebook. En cada
   proveedor configura el Client ID/Secret y añade la URL callback que muestra
   Supabase en el panel del proveedor correspondiente.
4. La app usa `signInWithOAuth`, `signInWithOtp`, `getSession` y
   `onAuthStateChange`. No hay cuenta local ni datos demo; si Supabase no está
   configurado, el portal muestra error de configuración.

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
  laudes jsonb, angelus jsonb, reflection text,
  image_url text, messages jsonb,
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
  task_date date not null default current_date,
  done boolean default false,
  completed_at timestamptz
);

create unique index spiritual_tasks_daily_unique
  on spiritual_tasks(profile_id, category, task_date)
  where category <> 'custom';

-- RPC idempotente llamada por useSpiritualTasks al iniciar sesión.
-- Debe insertar para auth.uid() / current_date usando ON CONFLICT DO NOTHING:
-- Laudes, Ángelus, Evangelio, Salmo, Primera Lectura, Segunda Lectura,
-- Santo Rosario y Examen de conciencia cada día; Confesión una vez al mes;
-- e Ir a Misa solo en domingo o si p_is_solemnity=true (dato de Gemini).
-- Nombre esperado:
-- ensure_daily_spiritual_tasks(p_date date, p_is_sunday boolean, p_is_solemnity boolean)

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

-- Suscripciones Web Push por dispositivo.
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Preferencias de recordatorios por correo vía Supabase/Worker.
create table notification_preferences (
  profile_id uuid primary key references profiles(id) on delete cascade,
  email_reminders boolean default true,
  push_reminders boolean default true,
  laudes_time text default '07:00',
  angelus_time text default '12:00',
  rosary_time text default '20:00',
  updated_at timestamptz default now()
);

-- Vista/RPC del lobby. La UI no contiene cifras por defecto.
-- Debe devolver una fila:
-- room_active boolean, people_now bigint, rosaries_today bigint,
-- users_today bigint, ave_marias_today bigint.
-- Nombre esperado: rosary_lobby_metrics()
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

El frontend usa `useSpiritualTasks`: primero ejecuta
`ensure_daily_spiritual_tasks(current_date, isSunday, isSolemnity, isFastingDay, dayOfMonth)`, consulta exclusivamente
`spiritual_tasks` filtrado por `auth.uid()` y se suscribe por Supabase Realtime.
Marcar una tarea actualiza `done` + `completed_at`; el estado se sincroniza en
todos los dispositivos y nunca depende de `useState` como fuente de verdad.

El SQL completo para crear esta función, sus índices y políticas RLS está en:

```text
supabase_regla_vida.sql
```

Ese archivo garantiza para todos los usuarios:

- Diarias: Ofrecimiento matutino, Laudes, Evangelio, Salmo, Primera lectura,
  Segunda lectura, Oración mental/silencio, Ángelus, Santo Rosario y Examen.
- Domingos o solemnidades: Santa Misa.
- Miércoles y viernes: Ayuno de hábito o de alimento.
- Mensual: Confesión o guía espiritual.

### 4.5 Avance interactivo del Rosario

El `PrayerEngine` **no usa tiempo para avanzar**. `tick()` solo mantiene
presencia y detecta inactividad. Un Step cambia exclusivamente por interacción
`🙏`/voz reconocida:
- En solitario: el usuario debe responder.
- En comunidad: líder terminado o consenso activo ≥70%.
- Un participante sin interacción durante 10 segundos queda fuera del
  denominador de consenso para no detener a la sala; no recibe avance ficticio.
- No existe `Math.random()`, simulación de respuestas ni timeout que complete
  oraciones/reflexiones automáticamente.

### 4.6 Presencia de Laudes y Ángelus

```sql
create table daily_prayer_presence (
  profile_id uuid not null references profiles(id) on delete cascade,
  prayer_kind text not null check (prayer_kind in ('laudes','angelus')),
  prayer_date date not null default current_date,
  last_seen timestamptz not null default now(),
  primary key (profile_id, prayer_kind, prayer_date)
);
```

`useDailyPrayerPresence` publica heartbeat mientras el usuario está dentro del
portal y cuenta perfiles con `last_seen` menor a 60 segundos. La dashboard y
los portales solo muestran el indicador si el contador real es mayor que cero;
nunca muestran “0 personas rezando”. Activa Realtime en esta tabla.

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
Eres un asistente litúrgico católico experto, con profundo conocimiento del
calendario litúrgico, el leccionario y la tradición de la Iglesia en Venezuela.
Usa Google Search grounding y fuentes verificables (Sitio del Vaticano,
Conferencia Episcopal Venezolana, ACI Prensa, Catholic News Agency, santoral
oficial). Devuelve SOLO JSON válido, sin comentarios, con EXACTAMENTE esta forma:

{
 "date","weekday","season","liturgicalColor","isSolemnity","liturgicalRank",
 "saint": {
   "name","title","imageUrl",
   "story": "historia narrativa rica y amena: origen, hechos decisivos, virtudes, martirio u obra, en 2-3 párrafos que enganchen",
   "highlights": ["hito 1","hito 2","hito 3"],
   "lessons": ["lección concreta para hoy 1","lección 2"],
   "exampleToday": "cómo imitarlo hoy, en lenguaje cercano",
   "gospelConnection": "cómo su vida refleja el Evangelio del día",
   "venezuelaRelevance": "por qué importa a los feligreses en Venezuela (devoción, templos, tradición)",
   "prayer": "oración propia o atribuida al santo, si existe; si no, cadena vacía"
 },
 "quote": {"text","ref"},
 "gospel": {
   "ref","title","body",
   "evangelist": "san Mateo|san Marcos|san Lucas|san Juan",
   "introFormula": "Lectura del santo Evangelio según <evangelista>",
   "closingProclaim": "Palabra del Señor",
   "closingResponse": "Gloria a ti, Señor Jesús",
   "threeCrosses": true,
   "imageSource": "término de búsqueda de arte sacro católico de dominio público"
 },
 "psalm": {"ref","title","body"},
 "firstReading": {"ref","title","body"},
 "secondReading": {"ref","title","body"} | null,
 "laudes":   <HOUR>, "vespers": <HOUR>, "compline": <HOUR>,
 "angelus": {
   "title","body",
   "verses": [ {"leader","response","at":0.0}, ... ],
   "audioUrl": "URL del Ángelus del Papa Francisco en español si existe, sino cadena vacía",
   "audioLabel": "Ángelus · Papa Francisco · español",
   "closingPrayer": "oración conclusiva del Ángelus"
 },
 "reflection": "...",
 "imagePrompt": "término de búsqueda de arte sacro católico (NO describir imagen a generar)",
 "catechism": {"number":"CEC nnn o nnn-nnn","title","text","applyToday"},
 "onThisDay": {"title","category":"milagro eucarístico|aparición mariana|evento bíblico|santo|hecho histórico","text","venezuela"},
 "messages": [ {"source","text","relevant":true|false,"date","sourceUrl"}, ... ],
 "suggestedNovenas": [{"title","reason"}] | null
}

donde <HOUR> = {
  "title","body","hour":"HH:MM","mood":"dawn|noon|dusk|night",
  "parts": [ {"kind","label","text","rubric","response"}, ... ]
}
y los "kind" de parts deben ser uno de: invitatory, hymn, psalmody, reading,
gospelCanticle, intercessions, ourFather, concludingPrayer, marianAntiphon,
examination, commendation, response.

REGLAS OBLIGATORIAS:
1. IDIOMA: todo el texto bíblico y litúrgico DEBE estar en español latinoamericano
   como se proclama en Venezuela, según el leccionario de la Conferencia Episcopal
   Venezolana / Biblia Latinoamericana / Nueva Biblia de los Hispanoamericanos.
   Nada de español peninsular ("vosotros").
2. LECTURAS: incluye SIEMPRE firstReading y psalm. Incluye secondReading con su
   texto cuando el leccionario del día la tenga (domingos, solemnidades, fiestas
   con segunda lectura); solo ponla en null cuando litúrgicamente NO exista ese
   día (ferias ordinarias sin segunda lectura). NUNCA omitas el campo.
3. LAUDES / VÍSPERAS / COMPLETAS: devuélvelas COMPLETAS como <HOUR> con todas sus
   parts reales (himno, salmodia con salmos del día, lectura breve, cántico
   evangélico —Benedictus en Laudes, Magníficat en Vísperas, Nunc Dimittis en
   Completas—, preces, Padre nuestro, oración conclusiva; Completas añade examen
   de conciencia, encomienda y antífona mariana final). mood: laudes=dawn,
   vespers=dusk, compline=night.
4. ÁNGELUS: devuelve los 3 versículos con su Ave María y la oración final como
   "verses" con "leader"/"response". Pon en "at" la fracción del audio (0..1) en
   que empieza cada verso para sincronizar con el audio del Papa Francisco en
   español si lo hay; si no puedes repartirlos equitativamente.
5. EVANGELIO: completa evangelist e introFormula con el evangelista correcto;
   threeCrosses=true; body debe ir SIN la fórmula inicial ni el cierre (la UI las
   añade). imageSource = términos de arte sacro católico (p.ej. "Caravaggio
   Calling of St Matthew public domain", "Virgen de Coromoto Catholic painting").
6. SANTO: story debe ser una biografía viva y bien contada (no una ficha seca);
   highlights 3-5 hitos; lessons 2-3 aplicaciones; prayer su oración si existe.
7. CATECISMO: una lección breve del Catecismo (CEC) conectada con las lecturas
   o el Evangelio del día; applyToday = una frase práctica.
8. ONTHISDAY: un milagro eucarístico, aparición mariana, evento bíblico o hecho
   católico ocurrido tal día como hoy, con relevancia para Venezuela en
   "venezuela". Si no hay nada verificable, omite el objeto (no lo inventes).
9. MESSAGES: recorre ESTAS 11 fuentes y, para cada una, busca un mensaje o
   cita auténtica que esté directamente relacionada con la fecha litúrgica o con
   el Evangelio del día: Virgen de Betania, Virgen de Medjugorje, Virgen de
   Fátima, Virgen de Lourdes, Papa León XIV, Papa Francisco, Papa San Juan Pablo
   II, Beato Carlo Acutis, San José Gregorio Hernández, Santa Madre Carmen
   Rendiles, Beata María de San José. Devuelve TODAS las que coincidan con
   relevant=true (pueden ser varias); las que no coincidan con relevant=false.
   No inventes mensajes; si no hay fuente verificable, relevant=false.
10. REFLECTION: una meditación ENFOCADA EN VENEZUELA que cruce el Evangelio, la
    primera y segunda lectura, el santo del día y los mensajes marianos/papales
    que resultaron relevantes. Tono esperanzador, concreto, pastoral.
11. NO INVENTES citas ni URLs. Si no puedes verificar algo, déjalo vacío o con
    relevant=false. La UI oculta lo no verificado.
Devuelve el JSON para la fecha ${today}.`;

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

    // 2) Imágenes públicas gratuitas (NO generación)
    // Gemini NO genera imágenes, solo sugiere términos de búsqueda de
    // imágenes de dominio público. Ej: "San Antonio de Padua painting
    // renaissance public domain" o "Jesus teaching crowd Wikimedia Commons".
    // El Worker resuelve esos términos a URLs reales:
    const dailyImageUrl = await resolvePublicImageViaWikimedia(liturgy.imagePrompt, env);
    liturgy.imageUrl = dailyImageUrl || liturgy.imageUrl; // fallback a lo que Gemini sugirió si ya es URL

    // 3) Imagen del Santo del día → Wikipedia / Wikimedia Commons (100% gratis)
    // NO usar Vertex AI Imagen. Buscar en:
    // - es.wikipedia.org/api/rest_v1/page/summary/{santo}
    // - commons.wikimedia.org/w/api.php?generator=search...
    if (liturgy.saint?.name) {
      const saintImageUrl = await resolveSaintImageViaWikimedia(liturgy.saint.name, env);
      liturgy.saint.imageUrl = saintImageUrl || liturgy.saint.imageUrl;
    }

    // 4) Respaldo gratuito si Gemini falla:
    // Si la llamada a Gemini falla o devuelve JSON inválido, el Worker debe:
    // - Intentar de nuevo con modelo gemini-1.5-flash-8b (más barato)
    // - Si sigue fallando, usar un fallback local: devolver la liturgia del día
    //   anterior o una liturgia mínima con lecturas vacías + mensaje
    //   "Contenido pendiente de generación".
    // - Nunca dejar la tabla daily_liturgy vacía.

    // 4) Endpoint bajo demanda POST /daily/generate (para el botón de la UI cuando no hay datos)
    // Mismo código que el cron, pero con { date } del body.

    // 5) Cachear en KV + Supabase (upsert por fecha)
    await env.DAILY_CACHE.put(today, JSON.stringify(liturgy), { expirationTtl: 172800 });
    await supabaseUpsert(env, "daily_liturgy", { date: today, ...liturgy });
  }
}
```

### 5.3 Consumo desde el frontend
`GET https://camino-api.byp.workers.dev/daily?date=YYYY-MM-DD` devuelve la fila
de `daily_liturgy` (o KV). El frontend lo consume con
`src/liturgy/useDailyLiturgy.ts` y lo mapea a `DailyLiturgy`.

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
   `https://camino-api.byp.workers.dev/whatsapp` y suscríbete a `messages`.

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
Supabase Storage. `src/media/registry.ts` ya no trae datos de ejemplo; el hook
`useWhatsAppAssets` consulta Supabase y escucha Realtime.

---

## 7. Variables de entorno (`.env.example`)

### Frontend (`.env.local`)
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_API_BASE=https://camino-api.byp.workers.dev
VITE_FRONTEND_URL=https://camino-6vx.pages.dev
VITE_VAPID_PUBLIC_KEY=...
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

### 7.1 Notificaciones push y correo

El frontend registra `/sw.js` y envía la suscripción Web Push al Worker:

- `POST https://camino-api.byp.workers.dev/notifications/subscribe`
- `POST https://camino-api.byp.workers.dev/notifications/email/reminders`

Variables Worker recomendadas:
```bash
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
RESEND_API_KEY=...              # o proveedor SMTP/Email elegido
FRONTEND_URL=https://camino-6vx.pages.dev
```

El Worker debe consultar `spiritual_tasks` y enviar recordatorios para tareas
pendientes: Laudes, Ángelus, Rosario y compromisos diarios. Para push usa la
tabla `push_subscriptions`; para correo usa `notification_preferences` y el
email de `auth.users`/`profiles`.

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

### 8.5 Misterios del Rosario según el día de la semana

El Rosario ya no está hardcodeado a los Dolorosos. `src/engine/devotions/
rosarioMisterios.ts` define los cuatro conjuntos con sus cinco misterios y
meditaciones, y expone `devotionIdForToday(date)` que resuelve el conjunto
correcto según el día:

| Día | Conjunto | Tema |
|-----|----------|------|
| Lunes / Sábado | Gozosos | Encarnación e infancia de Jesús |
| Martes / Viernes | Dolorosos | Pasión y muerte de Cristo |
| Miércoles / Domingo | Gloriosos | Triunfo sobre la muerte y gloria |
| Jueves | Luminosos | Ministerio público, luz del mundo |

`RosarioScreen` inicializa `selectedDevotionId` con `devotionIdForToday()`,
de modo que al entrar el usuario ve el Rosario que corresponde a ese día. El
menú hamburguesa del Lobby (`src/screens/rosario/Lobby.tsx`) lista los cuatro
Rosarios más las coronillas, marcando con una pastilla **HOY** el conjunto del
día y mostrando arriba «Hoy corresponde Misterios …». El Lobby recibe
`firstMysteryTitle` para pintar el «1.º MISTERIO» correcto en lugar del
antiguo valor fijo. Las coronillas siguen disponibles desde el mismo menú.

### 8.6 Instalación como app (PWA) en Android e iPhone

`src/pwa/useInstallPrompt.ts` detecta la plataforma y el estado de
instalación y expone un controlador con `mode` (`prompt` | `ios-guide` |
`installed` | `none`) y `canShow`. Lógica:

- **Android / Chrome desktop:** escucha `beforeinstallprompt`, guarda el
  evento y `promptInstall()` lanza el diálogo nativo. Si el usuario rechaza,
  se marca `dismiss` con un TTL de 7 días en `localStorage`
  (`camino_install_dismissed_at`) para no insistir.
- **iPhone / iPad (Safari):** no existe API de instalación. `mode` vale
  `ios-guide` y el botón abre `InstallIOSGuide`, un bottom-sheet con tres
  pasos ilustrados con los íconos del sistema (Compartir → Añadir a pantalla
  de inicio → Confirmar). Al cerrar se marca `dismiss`.
- **Ya instalada** (`display-mode: standalone` o `navigator.standalone`):
  el banner no aparece. Escucha `appinstalled` y el `matchMedia` de
  `display-mode` para reaccionar en caliente.

El banner (`src/pwa/InstallBanner.tsx`) se renderiza en `CaminoScreen`
envuelto en `AnimatePresence`, con entrada animada (slide-up + fade con
curva `[0.22,1,0.36,1]` y delay de 0.5 s), halo dorado ambiental, ícono con
glow pulsante y micro-interacciones (`whileHover`/`whileTap`). Requisitos
para que el prompt de Android funcione: `manifest.webmanifest` con íconos
192 y 512, y un service worker registrado (`public/sw.js`). Ambos ya están
incluidos.

---

### 8.7 Pestaña Rosario: devoción dinámica, contador de cuentas y salas vivas

**Subtítulo y botones reactivos.** El Lobby ya no confía en un `meta` estático:
lee la devoción seleccionada directamente de `DEVOTIONS[selectedDevotionId]`
(`src/screens/rosario/Lobby.tsx`). El título, el subtítulo y las etiquetas de
los dos botones se recomponen al cambiar de devoción, con una transición
`AnimatePresence` (`key={dev.id}`) para que el cambio se perciba, no solo se
pinte. Reglas de etiquetado:

- Rosarios (`ROSARIO_IDS`): botón principal «Iniciar Rosario Comunitario»,
  secundario «Rezar Rosario en solitario».
- Coronillas: botón principal «Iniciar Coronilla en comunidad», secundario
  «Rezar Coronilla en solitario». En ambos casos el botón lleva una segunda
  línea con el `subtitle` de la devoción (p. ej. «Misterios Gozosos»,
  «Divina Misericordia»), de modo que siempre queda claro qué se va a rezar.
- Si ya hay salas activas, el botón principal muta a «Unirme a {título}».

**Contador de cuentas.** Durante las decenas (steps `repeat-prayer`), el
`RosaryRing` (`src/components/RosaryRing.tsx`) actúa como contador numérico:
el dígito central anima con `AnimatePresence` al cambiar, las cuentas se
encienden una a una con entrada escalonada, y la cuenta en curso
(`activeBead = repeatIndex`) pulsa con un halo dorado. El anillo es
parametrizable por `size` (152 px en el rezo, 188 px en el lobby) para caber
sin scroll. En pasos sin cuentas (anuncios, Padrenuestro, Gloria, etc.) el
escenario muestra un anillo de contexto con el número de misterio; en el
interludio, un dial de tiempo. El layout de `LiveSession` es
`h-[100dvh] flex-col overflow-hidden`: el escenario (contador) y la barra de
progreso son `shrink-0`, y solo la tarjeta de oración / chat hace scroll
interno, así el contador nunca desaparece.

**Obra comunitaria como aura.** El SVG vivo (`CommunityWorkSvg`) ya no ocupa un
bloque cuadrado propio durante el rezo: se dibuja detrás del contador como un
aura tenue (`opacity 0.3`, con máscara radial), de modo que las firmas de la
comunidad laten alrededor de las cuentas sin competir por espacio. Su progreso
real se muestra como una barra lineal dorada bajo el escenario.

**Muro de salas vivas.** El antiguo «Muro de Contemplación» con contadores
estáticos se sustituyó por `SALAS EN ORACIÓN` (`src/rosary/useActiveRooms.ts`),
una lista en tiempo real de salas activas de rosarios, coronillas y Horas
(Laudes / Vísperas / Completas). Cada sala muestra ícono, título, subtítulo,
un punto verde con `ping`, el número de orantes y un botón **UNIRME**. Unirse a
una sala de devoción cambia `selectedDevotionId` y llama a `joinExisting()`
(esperando al commit del motor vía `pendingJoinRef`); unirse a una Hora abre su
portal (`onOpenHour`). Si no hay salas, el muro muestra una vela animada con el
mensaje «Sé el primero en encender una llama». El hook consulta la RPC
`active_prayer_rooms()` y se suscribe por Realtime a `sessions` y
`participants`; cuando Supabase no está configurado devuelve salas de muestra
derivadas del catálogo para que la interfaz sea evaluable —en producción con
Supabase esas salas NUNCA aparecen.

SQL sugerido para la RPC:

```sql
create or replace function active_prayer_rooms()
returns table(session_id uuid, devotion_id text, participants int, started_at timestamptz)
language sql stable as $$
  select s.id, s.devotion_id,
         count(p.id)::int as participants, s.started_at
  from sessions s
  left join participants p
    on p.session_id = s.id and p.last_seen >= now() - interval '30 seconds'
  where s.status = 'running'
  group by s.id, s.devotion_id, s.started_at
  having count(p.id) > 0
  order by participants desc;
$$;
```

Para incluir Horas en el muro, el Worker puede emitir filas con
`devotion_id = 'hour:laudes' | 'hour:vespers' | 'hour:compline'` agregando la
presencia desde `daily_prayer_presence`; el frontend las rutea al portal
correspondiente al pulsar UNIRME.

---

## 9. Checklist de puesta en marcha

- [ ] Proyecto Supabase creado y esquema SQL aplicado (sección 4.2)
- [ ] Site URL, redirect URLs, Email Magic Link y social login (Google/Apple/Facebook) configurados
- [ ] RLS activo, especialmente candles y garden_events/garden_waterings sin UPDATE/DELETE
- [ ] Confirmado que NO existe columna `garden_dna`: el ADN se deriva en el
      cliente vía SHA-256(auth.uid()) (sección 8.1)
- [ ] Realtime habilitado en `participants`, `progress`, `chat`, `candles`
- [ ] Realtime habilitado en `assets` para que cada upload aparezca sin recargar
- [ ] Cron diario que inserta Laudes/Ángelus/Rosario en `spiritual_tasks`
- [ ] Worker `daily-generate` con `GEMINI_API_KEY` y cron 1×/día
- [ ] Bucket R2 `camino-audio` + Webhook de WhatsApp verificado
- [ ] VAPID keys configuradas y tablas `push_subscriptions`/`notification_preferences` creadas
- [ ] Endpoints `/notifications/subscribe` y `/notifications/email/reminders` funcionando
- [ ] `ADMIN_PHONE` configurado (solo ese número puede subir audios)
- [ ] Imágenes del Evangelio y del santo resueltas con `resolveCatholicImage`
      (arte sacro católico de dominio público vía Wikimedia Commons)
- [ ] Confirmado que completar Jornada / lector / portal marca las tareas de la
      Regla de Vida vía `markCategoriesDone` (sección 10)

---

## 10. Sincronización automática de la Regla de Vida

El frontend NO espera a que el usuario marque a mano lo que ya rezó. Al
completar una acción, `src/rule/markTasks.ts#markCategoriesDone(userId, cats)`
hace `UPDATE spiritual_tasks SET done=true, completed_at=now()` para el día de
hoy y las categorías correspondientes; el Realtime propaga el cambio a la
pestaña Regla sin recargar. Mapeo (`categoriesForTarget`):

| Acción del usuario | Categorías que se saldan |
|---|---|
| Completar "Comenzar mi jornada" | ofrecimiento, gospel, psalm, first_reading, second_reading, silence |
| Leer Evangelio (con rito de 3 cruces) | gospel |
| Rezar Salmo | psalm |
| Leer 1ª / 2ª lectura | first_reading / second_reading |
| Rezar Laudes / Ángelus / Vísperas | laudes / angelus / vespers |
| Completas, Catecismo, Un día como hoy | (no saldan tarea obligatoria) |

`JORNADA_CATEGORIES` define el conjunto de la Jornada. Las Completas y el
Catecismo del día son contenido formativo, no tareas obligatorias diarias.

## 11. Imágenes de fuente católica

Gemini **no genera** imágenes: devuelve términos de búsqueda de arte sacro
(`imagePrompt`, `gospel.imageSource`, `saint.imageUrl` como término). El
frontend (`src/media/imageResolver.ts#resolveCatholicImage`) los resuelve contra
Wikimedia Commons priorizando vocabulario de arte sacro católico ("Catholic
religious painting", "sacred art Virgin Mary Jesus", "arte sacro católico"), de
modo que el Evangelio y el santo del día muestren obras de tradición católica
en dominio público (p. ej. digitalizaciones del Prado, Pinacoteca Vaticana,
etc.). Si no hay coincidencia cae a `resolveDailyImage` (dominio público
genérico) y por último al placeholder local `/images/daily.jpg`.
- [ ] `public/manifest.webmanifest`, `public/manifest.json` e íconos 192/512
      presentes (necesarios para el prompt PWA de Android)
- [ ] Verificado que `devotionIdForToday()` resuelve el conjunto correcto
      según el día (sección 8.5)
- [ ] Frontend desplegado en Cloudflare Pages apuntando a `VITE_API_BASE`
- [ ] `GET /daily` devolviendo la liturgia del día generada por Gemini
