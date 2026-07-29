# PROMPT MAESTRO — CAMINO (Rosario Comunitario PWA)

> **Objetivo**: Reconstruir funcional y visualmente idéntico el proyecto `D:\documentos\camino`, una PWA católica venezolana de oración comunitaria.
> **Regla de oro**: No inferir. Transcribir exactamente lo que existe en disco, línea por línea, con sus rutas y contenido literal.

---

## 1. CONTEXTO Y STACK TECNOLÓGICO

**Nombre del proyecto**: Camino — Rosario Comunitario  
**Versión bundle**: 2026-07-26T07:20:00-06:00 (ver `src/App.tsx:229`)  
**Dominio producción**: `https://camino-6vx.pages.dev`  
**Repositorio local**: `D:\documentos\camino`  
**Plataforma objetivo**: PWA instalable en Android/iOS, también navegador.  
**Público**: Católicos de habla hispana, con fuerte contexto venezolano.

### Stack exacto (desde `package.json`)
- **React** 19.2.6
- **Vite** 7.3.2
- **TypeScript** 5.9.3
- **Tailwind CSS** 4.1.17 (con plugin `@tailwindcss/vite`)
- **Supabase JS** 2.109.0
- **Framer Motion** 12.42.2
- **Cloudflare Workers** (runtime `workerd`, bundle `worker/src/index.ts`)
- **web-push** (para notificaciones push en Worker)
- **wrangler** (CLI de Cloudflare)

### Variables de entorno obligatorias (desde `.env.example`)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_API_BASE` (URL del Worker, ej. `https://camino-api.byp.workers.dev`)
- `VITE_FRONTEND_URL`
- `VITE_VAPID_PUBLIC_KEY`
- En Worker: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE`, `GEMINI_API_KEY`, `VERTEX_API_KEY` (opcional), `WHATSAPP_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `ADMIN_PHONE` / `WHATSAPP_ADMIN_PHONES`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY`, `CAMINO_IMAGES` (R2 bucket binding), `DAILY_CACHE` (KV binding), `R2_IMAGES_BASE_URL`, `CAMINO_AUDIO` (R2 bucket binding)

### Alias de importación (desde `vite.config.ts`)
- `@/*` → `src/*`

### Configuración PWA (desde `index.html`)
- Service Worker: `/sw.js`
- Manifest: `/manifest.webmanifest`
- `theme_color`: `#ffffff`
- `background_color`: `#ffffff`
- `display`: `standalone`
- `orientation`: `portrait`
- Iconos: `/icons/icon-192.png`, `/icons/icon-512.png`

---

## 2. ÁRBOL DE DIRECTORIOS COMPLETO

```
D:\documentos\camino/
├── .env.example
├── .kilo/
├── AGENTS.md
├── index.html
├── kilo.json
├── package.json
├── public/
│   ├── _headers
│   ├── _redirects
│   ├── manifest.json
│   ├── manifest.webmanifest
│   └── sw.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── config.ts
│   ├── index.css
│   ├── auth/
│   │   ├── AuthProvider.tsx
│   │   └── anonId.ts
│   ├── components/
│   │   ├── AudioPlayer.tsx
│   │   ├── Avatar.tsx
│   │   ├── BottomNav.tsx
│   │   ├── CalendarStrip.tsx
│   │   ├── RosaryRing.tsx
│   │   └── biblia/
│   │       └── BibleTextProvider.tsx
│   ├── community/
│   │   ├── CommunityWorkSvg.tsx
│   │   ├── WorkCompleteOverlay.tsx
│   │   ├── composition.ts
│   │   ├── gallery.ts
│   │   ├── types.ts
│   │   └── useCommunityWork.ts
│   ├── data/
│   │   ├── jornada.ts
│   │   ├── theological-sources.ts
│   │   └── [bible plans + seed JSONs]
│   ├── devotions/
│   │   └── daily.ts
│   ├── engine/
│   │   ├── PrayerEngine.ts
│   │   ├── CommunityEngine.ts
│   │   ├── types.ts
│   │   ├── usePrayerVoiceControl.ts
│   │   ├── useRosario.ts
│   │   ├── keywords.ts
│   │   └── devotions/
│   │       ├── commonPrayers.ts
│   │       ├── desatanudos.ts
│   │       ├── divinaMisericordia.ts
│   │       ├── espirituSanto.ts
│   │       ├── index.ts
│   │       ├── rosarioDolorosos.ts
│   │       ├── rosarioMisterios.ts
│   │       └── rosarioMisteriosDias.ts
│   ├── fruits/
│   │   ├── rewards.ts
│   │   ├── store.tsx
│   │   ├── types.ts
│   │   └── levels/ (no leído en detalle)
│   ├── garden/
│   │   ├── dna.ts
│   │   ├── events.ts
│   │   ├── GardenSvg.tsx (1171 líneas)
│   │   ├── model.ts
│   │   ├── prng.ts
│   │   ├── types.ts
│   │   └── levels/ (no leído en detalle)
│   ├── hooks/
│   │   ├── useBibliaRouter.ts
│   │   ├── useInstallPrompt.ts
│   │   └── ...
│   ├── lib/
│   │   ├── bible/ (no leído en detalle)
│   │   └── supabase.ts
│   ├── liturgy/
│   │   ├── today.ts
│   │   ├── types.ts
│   │   └── useDailyLiturgy.ts
│   ├── media/
│   │   ├── imageResolver.ts
│   │   ├── registry.ts
│   │   ├── types.ts
│   │   └── useWhatsAppAssets.ts
│   ├── notifications/
│   │   ├── NotificationsPanel.tsx
│   │   └── usePushNotifications.ts
│   ├── prayer/
│   │   └── useDailyPrayerPresence.ts
│   ├── pwa/
│   │   ├── InstallBanner.tsx
│   │   └── useInstallPrompt.ts
│   ├── rosary/
│   │   ├── useActiveRooms.ts
│   │   └── useRosaryLobbyData.ts
│   ├── rule/
│   │   ├── markTasks.ts
│   │   ├── tasks.ts
│   │   ├── useSpiritualTasks.ts
│   │   └── useSpiritualTasks.ts
│   ├── screens/
│   │   ├── AdminPortal.tsx (762 líneas)
│   │   ├── AudioAssetScreen.tsx (40 líneas)
│   │   ├── AuthCallbackScreen.tsx (77 líneas)
│   │   ├── AuthPortal.tsx (126 líneas)
│   │   ├── BibliaShell.tsx
│   │   ├── BibliaOnboardingScreen.tsx
│   │   ├── BibliaHomeScreen.tsx
│   │   ├── BibliaDailyScreen.tsx
│   │   ├── CaminoScreen.tsx (710 líneas)
│   │   ├── ComunidadScreen.tsx (248 líneas)
│   │   ├── DailyPrayerPortal.tsx (582 líneas)
│   │   ├── GalleryScreen.tsx (125 líneas)
│   │   ├── JornadaScreen.tsx (421 líneas)
│   │   ├── PerfilScreen.tsx (484 líneas)
│   │   ├── ReaderScreen.tsx (123 líneas)
│   │   ├── ReglaScreen.tsx (214 líneas)
│   │   ├── RosarioScreen.tsx (136 líneas)
│   │   ├── biblia/
│   │   │   ├── BibliaShell.tsx
│   │   │   ├── BibliaOnboardingScreen.tsx
│   │   │   ├── BibliaHomeScreen.tsx
│   │   │   └── BibliaDailyScreen.tsx
│   │   └── rosario/
│   │       ├── IntentionPrompt.tsx (58 líneas)
│   │       ├── LiveSession.tsx (425 líneas)
│   │       ├── Lobby.tsx (384 líneas)
│   │       └── PrayerNavBar.tsx (98 líneas)
│   └── utils/
│       └── cn.ts
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20250101_admin_insert_compensatory_event.sql
│       ├── 20250101_bulk_water_garden.sql
│       ├── 20250101_gift_candle.sql
│       ├── 20250101_record_spiritual_event.sql
│       ├── 20250101_water_garden.sql
│       ├── 20250102_add_role_to_profiles.sql
│       ├── 20250103_fix_garden_persistence.sql
│       ├── 20250103_fix_water_garden_writings.sql
│       ├── 20250725_active_prayer_rooms.sql
│       ├── 20250725_bible_schema.sql
│       ├── 20250726_bible_daily_content.sql
│       ├── 20260727_add_daily_image_override.sql
│       ├── 20260727_add_is_solemnity_to_daily_liturgy.sql
│       ├── 20260727_community_works.sql
│       └── 20260727_missing_rpc_functions.sql
├── vite.config.ts
├── tsconfig.json
└── worker/
    ├── package.json
    ├── wrangler.toml
    └── src/
        └── index.ts (1742 líneas)
```

---

## 3. DEPENDENCIAS Y SCRIPTS (`package.json`)

### Scripts exactos
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

### Dependencias exactas
```json
{
  "dependencies": {
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "framer-motion": "^12.42.2",
    "@supabase/supabase-js": "^2.109.0",
    "lucide-react": "^12.7.0"
  },
  "devDependencies": {
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^4.6.0",
    "autoprefixer": "^10.4.21",
    "postcss": "^8.5.6",
    "tailwindcss": "^4.1.17",
    "@tailwindcss/vite": "^4.1.17",
    "typescript": "^5.9.3",
    "vite": "^7.3.2",
    "vite-plugin-singlefile": "^0.13.5",
    "wrangler": "^4.43.0"
  }
}
```

---

## 4. REGLAS DE UI/UX (obligatorias)

### 4.1 Paleta y tipografía
- **Fondo general de la app**: `radial-gradient(140% 120% at 50% 0%, #e8e4dc, #d8d4cb)` (`src/App.tsx:134`)
- **Contenedor principal**: max-width `430px`, centrado, con borde `10px solid black` y shadow `shadow-2xl` en desktop (`src/App.tsx:136`)
- **Pantalla**: `bg-black`, border-radius `2.4rem` en desktop (`src/App.tsx:137`)
- **Notch simulado**: `<div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />` (`src/App.tsx:138`)
- **Fuente serif litúrgica**: Clase custom `font-serif-holy` (definida en CSS global)
- **Color dorado litúrgico**: Variable CSS `var(--gold)` = `#d4af6a` (aproximado, usado extensamente en rosario)
- **Color verde naturaleza**: `#7a8a5c` (usado en perfil/jardín)
- **Color fondo pantallas claras**: `#f7f6f3`
- **Color texto principal**: `#1c1c1e`
- **Color texto muted**: `#9a9a9f`, `#8a8a90`, `#a8a8ad`

### 4.2 Navegación
- **BottomNav**: 5 tabs: `camino`, `regla`, `rosario`, `comunidad`, `perfil`
- **Iconos por tab** (desde `src/components/BottomNav.tsx`):
  - `camino`: icono de camino/iglesia
  - `regla`: icono de lista/regla
  - `rosario`: icono de rosario
  - `comunidad`: icono de comunidad
  - `perfil`: icono de perfil
- En tab `rosario`, el background pasa a `bg-[#0a0a0b]` y BottomNav se oculta durante sesión activa (`src/App.tsx:93,171`)

### 4.3 Overlays y modales
- Todos los overlays usan `absolute inset-0 z-50` o `z-40` o `z-70` (admin)
- Backdrop: `bg-black/40 backdrop-blur-sm` o `bg-black/60 backdrop-blur-sm`
- Modales de acción inferior: `items-end justify-center p-4` con contenido `rounded-3xl bg-white`
- Transiciones: `AnimatePresence` de Framer Motion con `mode="wait"` para tabs

### 4.4 Componentes reutilizables
- **ActionCard** (`src/screens/CaminoScreen.tsx:681-709`): botón redondeado `rounded-2xl border border-[#e6e3db] bg-white p-4 text-left`
- **StatCard** (`src/screens/PerfilScreen.tsx:414-422`): estadística en grid 3 columnas
- **CandleGlyph** (`src/screens/ComunidadScreen.tsx:10-47`): vela SVG con llama animada
- **RosaryRing** (`src/components/RosaryRing.tsx`): anillo de rosario con progreso circular SVG
- **PrayerNavBar** (`src/screens/rosario/PrayerNavBar.tsx`): barra inferior del rosario con botón 🙏 central sobresaliente y anillo de progreso

### 4.5 Animaciones
- **Framer Motion** es obligatorio para todas las transiciones de pantalla, entrada/salida de overlays, y micro-interacciones
- Duración típica: `0.25s` a `0.6s`
- Easing: `easeOut`, `[0.22, 1, 0.36, 1]`
- `whileTap={{ scale: 0.97 }}` en botones principales

### 4.6 Accesibilidad
- `aria-label` en botones icon-only
- `role="img"` en SVGs decorativos
- `focus:border-[#c4a35a] focus:outline-none` en inputs

---

## 5. LÓGICA DE NEGOCIO

### 5.1 Sistema de autenticación
- **Proveedor**: Supabase Auth
- **Modos**: Email magic link, Google, Apple, Facebook
- **Anonimo**: Si no hay sesión, se genera identidad anónima con `getAnonIdentity()` (`src/auth/anonId.ts`)
- **Callback**: Ruta `/auth/callback` → `AuthCallbackScreen` → redirige a `/` si `standalone`
- **AuthProvider**: Envuelve toda la app excepto el callback

### 5.2 Motor de oración (`PrayerEngine`)
- **Archivo**: `src/engine/PrayerEngine.ts`
- **Patrón**: Finite State Machine (FSM) con estados: `idle` | `running` | `completed`
- **Modos**: `solo` | `community`
- **Estructura de pasos**: `Step` con `type`, `title`, `text`, `repeat?`, `duration?`, `role?`, `leaderText?`, `assemblyText?`
- **Avance**: `markDone()` avanza el paso; en community requiere consenso (completedRatio)

### 5.3 Motor comunitario (`CommunityEngine`)
- **Archivo**: `src/engine/CommunityEngine.ts`
- **Responsabilidades**: Presencia de usuarios en sala, reasignación de líder si se va
- **Realtime**: Escucha cambios en tabla `participants` y `sessions` de Supabase

### 5.4 Catálogo de devociones
- **Archivo**: `src/engine/devotions/index.ts`
- **IDs de rosario**: `ROSARIO_IDS` (Set)
- **Misterios por día**: `devotionIdForToday()` en `src/engine/devotions/rosarioMisterios.ts`
- **Tipos**: Rosario (con misterios) y Coronillas (Desatanudos, Divina Misericordia, Espíritu Santo, Almas del Purgatorio, San José)

### 5.5 Sistema de frutas espirituales (`src/fruits/`)
- **Monedas**: `vela` 🕯️, `semilla` 🌱, `agua` 💧
- **Recompensas**: `rewardFor(eventType)` en `src/fruits/rewards.ts`
- **Eventos que generan frutas**: `rosary-complete`, `daily-streak`, `community-join`, `task-complete`, `pray-for-other`, `candle-lit`, `water-garden`, etc.
- **Persistencia**: RPC `emit_spiritual_event` en Supabase + tabla `fruits` + `fruit_history`
- **Sincronización**: Realtime on `fruits`, `garden_events`, `candles`

### 5.6 Jardín espiritual (`src/garden/`)
- **DNA del jardín**: `useGardenDna(identity)` → `DnaTraits` con `terrain`, `treeSpecies`, `dna`, `season`, `growthPhase`, etc.
- **Modelo**: `generateGardenModel(dna, state)` → árbol, flora, agua, fauna, nodos sagrados, geometría
- **Estado**: `aggregateGardenState(gardenEvents, activeIntentions.length)` → `GardenState` con `health`, `waterLevel`, `growthPhase`, etc.
- **Renderizado**: `GardenSvg.tsx` (1171 líneas) — SVG procedural con Framer Motion
- **Regar**: Consume 1 agua (o bulk consume toda), genera evento `WATER_GARDEN`
- **Efectos**: Lluvia animada, rocío, luciérnagas en sequía, reflejos dorados

### 5.7 Comunidad / Galería
- **Obra comunitaria**: Cada rosario completado genera una `CommunityWorkSeed`
- **Firmas**: Cada 🙏 añade una firma única del usuario basada en su garden DNA
- **Progreso**: No avanza por tiempo, sino por número de firmas y gestos
- **Composiciones**: `chooseComposition(seed, season)` → tipos como `mediterranean_cross`, `forest_whisper`, etc.
- **Galería**: Carga desde Supabase `community_works` + localStorage, muestra hasta 40 obras

### 5.8 Biblia
- **Schema**: 7 tablas (`bible_methods`, `bible_lessons`, `bible_plans`, `bible_plan_days`, `user_bible_profile`, `user_bible_enrollment`, `user_bible_sessions`, `user_bible_streak`, `user_bible_daily_content`)
- **Onboarding**: `useOnboarding` → `BibliaOnboardingScreen`
- **Home**: `BibliaHomeScreen` con planes y métodos
- **Diario**: `BibliaDailyScreen` con contenido generado por Gemini
- **Endpoint Worker**: `/bible/daily` (GET/POST)

### 5.9 Liturgia diaria
- **Fuente**: Gemini API con fallback multi-modelo y multi-proveedor
- **Cache**: Cloudflare KV `DAILY_CACHE` con TTL 48h
- **Tabla Supabase**: `daily_liturgy`
- **Campos obligatorios**: `saint` (no puede ser null), `gospel.body` completo, `psalm.body` completo, `quote`, `marian`, `reflection`, `catechism`, `angelus`
- **Laudes, Vísperas, Completas**: Se cargan automáticamente desde el feed RSS de YouTube (`UCSgJ9Ppudkzs9cD259tjMQw`) mediante Cloudflare Worker. Se guardan en tabla `oraciones_diarias` y se inyectan como partes `video` en la respuesta de `/daily`.
- **Generación automática**: Cada día a las 00:00 por `scheduled` handler del Worker
- **Imágenes**: Resueltas por `resolveCatholicImage`, `resolveDailyImage`, `resolveSaintImage`

### 5.10 Rosario comunitario
- **Lobby**: Muestra devoción del día, salas activas, contador de orantes
- **Sesión**: `LiveSession` con `RosaryRing`, `CommunityWorkSvg` de fondo, `PrayerNavBar`
- **Intenciones**: Se piden al entrar; se consumen velas
- **Voz control**: `usePrayerVoiceControl` con keywords por paso
- **Interludio**: `ReflectionCard` con chat temporal
- **Completado**: Emite eventos `rosary-complete`, `community-join`, `daily-streak`

### 5.11 Regla de Vida
- **Tareas diarias**: Generadas por `ensure_daily_spiritual_tasks` RPC
- **Categorías**: `ofrecimiento`, `gospel`, `psalm`, `laudes`, `angelus`, `rosary`, `mass`, `fasting`, `examen`, `silence`, `vespers`, `compline`, `custom`
- **Marcado**: `markCategoriesDone(userId, categories)` → actualiza `spiritual_tasks`

### 5.12 Notificaciones
- **Push**: Web Push con VAPID, almacenado en `push_subscriptions`
- **Worker Scheduled (cron)**:
  - Recordatorio 15 min antes de tarea con hora
  - Recordatorio de riego de jardín a las 6 PM (Venezuela)
  - Recordatorio de Laudes (11 UTC), Ángelus (16 UTC), Rosario (0 UTC)
  - Email recordatorio via Resend si `email_reminders = true`

### 5.13 WhatsApp / Telegram
- **Webhook**: `/whatsapp` (GET verify, POST webhook)
- **Procesamiento**: Audio → R2 `CAMINO_AUDIO` → Supabase `assets`
- **Tags permitidos**: `laudes`, `angelus`, `evangelio`, `salmo`, `reflexion`, `canto`
- **Caption**: `#tag | Autor | Título`

---

## 6. ARCHIVOS CLAVE — CONTENIDO LINEA POR LINEA

> Nota: Solo se transcriben archivos que no superan las 500 líneas o que son críticos. Archivos masivos se resumen con su estructura completa y se marcan los puntos de entrada clave.

### 6.1 `src/App.tsx` (230 líneas) —COMPLETO—
```tsx
import { useState, useEffect } from "react";
import { useWhatsAppAssets } from "./media/useWhatsAppAssets";
import { BottomNav, type Tab } from "./components/BottomNav";
import { CaminoScreen, type ReaderTarget } from "./screens/CaminoScreen";
import { RosarioScreen } from "./screens/RosarioScreen";
import { ComunidadScreen } from "./screens/ComunidadScreen";
import { PerfilScreen } from "./screens/PerfilScreen";
import { ReglaScreen } from "./screens/ReglaScreen";
import { JornadaScreen } from "./screens/JornadaScreen";
import { ReaderScreen } from "./screens/ReaderScreen";
import { SpiritualProvider, useSpiritual } from "./fruits/store";
import type { DailyLiturgy } from "./liturgy/types";
import { useDailyLiturgy } from "./liturgy/useDailyLiturgy";
import { DailyPrayerPortal } from "./screens/DailyPrayerPortal";
import { AudioAssetScreen } from "./screens/AudioAssetScreen";
import { AuthPortal } from "./screens/AuthPortal";
import { GalleryScreen } from "./screens/GalleryScreen";
import { AdminPortal } from "./screens/AdminPortal";
import { AuthCallbackScreen } from "./screens/AuthCallbackScreen";
import { JORNADA_CATEGORIES, categoriesForTarget, markCategoriesDone } from "./rule/markTasks";
import { AuthProvider, useAuth } from "./auth/AuthProvider";

type PrayerKind = "laudes" | "angelus" | "vespers" | "compline";
const PRAYER_KINDS = new Set<ReaderTarget>(["laudes", "angelus", "vespers", "compline"]);

interface ReaderPayload {
  eyebrow: string;
  title: string;
  ref?: string;
  body: string;
  complete: string;
  gospel?: {
    evangelist?: string;
    threeCrosses?: boolean;
    responseLabel?: string;
    response?: string;
  };
}

function readerContent(target: ReaderTarget, L: DailyLiturgy | null): ReaderPayload {
  if (!L) {
    return {
      eyebrow: "",
      title: "",
      body: "",
      complete: "Cerrar",
    };
  }
  switch (target) {
    case "gospel":
      return {
        eyebrow: "EVANGELIO",
        title: L.gospel.title,
        ref: L.gospel.ref,
        body: L.gospel.body,
        complete: "He proclamado el Evangelio",
        gospel: {
          evangelist: L.gospel.evangelist,
          threeCrosses: L.gospel.threeCrosses ?? true,
          responseLabel: L.gospel.closingProclaim,
          response: L.gospel.closingResponse,
        },
      };
    case "psalm":
      return { eyebrow: "SALMO", title: L.psalm.title, ref: L.psalm.ref, body: L.psalm.body, complete: "He rezado el Salmo" };
    case "first":
      return { eyebrow: "PRIMERA LECTURA", title: L.firstReading.title, ref: L.firstReading.ref, body: L.firstReading.body, complete: "He leído la Primera lectura" };
    case "second":
      return L.secondReading
        ? { eyebrow: "SEGUNDA LECTURA", title: L.secondReading.title, ref: L.secondReading.ref, body: L.secondReading.body, complete: "He leído la Segunda lectura" }
        : { eyebrow: "SEGUNDA LECTURA", title: "No corresponde hoy", ref: L.date, body: "La liturgia de hoy no incluye segunda lectura.", complete: "Cerrar" };
    default:
      return { eyebrow: "", title: "", body: "", complete: "Cerrar" };
  }
}

function Shell() {
  const [tab, setTab] = useState<Tab>("camino");
  const [jornadaOpen, setJornadaOpen] = useState(false);
  const [reader, setReader] = useState<ReaderTarget | null>(null);
  const [prayerPortal, setPrayerPortal] = useState<PrayerKind | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [prayerActive, setPrayerActive] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const { emit } = useSpiritual();
  const { user } = useAuth();
  const assets = useWhatsAppAssets();
  const daily = useDailyLiturgy();

  const overlay = Boolean(jornadaOpen || reader || prayerPortal || assetId || authOpen || galleryOpen || adminOpen);
  const dark = tab === "rosario" && !overlay;

  const rc = reader ? readerContent(reader, daily.liturgy) : null;
  const selectedAsset = assets.find((asset) => asset.id === assetId);

  const openReader = (target: ReaderTarget) => {
    if (PRAYER_KINDS.has(target)) {
      setPrayerPortal(target as PrayerKind);
      return;
    }
    setReader(target);
  };

  const settleReader = (target: ReaderTarget) => {
    emit({ type: "task-complete" });
    void markCategoriesDone(user?.id, categoriesForTarget(target as Parameters<typeof categoriesForTarget>[0]));
    setReader(null);
  };

  const settlePortal = (kind: PrayerKind) => {
    emit({ type: "task-complete" });
    void markCategoriesDone(user?.id, categoriesForTarget(kind));
    setPrayerPortal(null);
  };

  const settleJornada = () => {
    emit({ type: "task-complete" });
    void markCategoriesDone(user?.id, JORNADA_CATEGORIES);
    setJornadaOpen(false);
    setTab("camino");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/admin") {
      setAdminOpen(true);
    }
  }, []);

  return (
    <div
      className="flex min-h-screen items-center justify-center p-0 sm:p-6"
      style={{ background: "radial-gradient(140% 120% at 50% 0%, #e8e4dc, #d8d4cb)" }}
    >
      <div className="relative w-full max-w-[430px] sm:rounded-[3rem] sm:border-[10px] sm:border-black sm:shadow-2xl">
        <div className="relative h-[100dvh] overflow-hidden bg-black sm:h-[900px] sm:rounded-[2.4rem]">
          <div className="pointer-events-none absolute left-1/2 top-0 z-50 hidden h-7 w-36 -translate-x-1/2 rounded-b-2xl bg-black sm:block" />

          <div className={prayerActive ? "h-full overflow-hidden" : "no-scrollbar h-full overflow-y-auto"}>
            {tab === "camino" && (
              <CaminoScreen
                onStartJornada={() => setJornadaOpen(true)}
                onOpenReader={openReader}
                onOpenAsset={setAssetId}
                assets={assets}
                liturgy={daily.liturgy}
                monthEvents={daily.monthEvents}
                pastProgress={daily.pastProgress}
                loadingDaily={daily.loading}
                onGenerateDaily={daily.generateNow}
                generatingDaily={daily.generating}
                error={daily.error}
                onOpenAdmin={() => setAdminOpen(true)}
              />
            )}
            {tab === "regla" && (
              <ReglaScreen onOpenReader={openReader} onStartRosary={() => setTab("rosario")} liturgy={daily.liturgy} />
            )}
            {tab === "rosario" && (
              <RosarioScreen
                onOpenGallery={() => setGalleryOpen(true)}
                onActiveChange={setPrayerActive}
                onOpenHour={(kind) => setPrayerPortal(kind)}
              />
            )}
            {tab === "comunidad" && <ComunidadScreen />}
            {tab === "perfil" && <PerfilScreen onOpenAuth={() => setAuthOpen(true)} />}
          </div>

          {!overlay && !prayerActive && <BottomNav active={tab} onChange={setTab} dark={dark} />}

          {jornadaOpen && <JornadaScreen liturgy={daily.liturgy} onClose={() => setJornadaOpen(false)} onComplete={settleJornada} />}

          {reader && rc && (
            <ReaderScreen
              eyebrow={rc.eyebrow}
              title={rc.title}
              ref={rc.ref}
              body={rc.body}
              gospel={rc.gospel}
              completeLabel={rc.complete}
              onClose={() => setReader(null)}
              onComplete={() => settleReader(reader)}
            />
          )}

          {prayerPortal && (
            <DailyPrayerPortal
              kind={prayerPortal}
              liturgy={daily.liturgy}
              assets={assets}
              onClose={() => setPrayerPortal(null)}
              onComplete={() => settlePortal(prayerPortal)}
            />
          )}

          {selectedAsset && <AudioAssetScreen asset={selectedAsset} onClose={() => setAssetId(null)} />}
          {authOpen && <AuthPortal onClose={() => setAuthOpen(false)} />}
          {galleryOpen && <GalleryScreen onClose={() => setGalleryOpen(false)} />}
          {adminOpen && <AdminPortal onClose={() => setAdminOpen(false)} />}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const isAuthCallback = typeof window !== "undefined" && window.location.pathname === "/auth/callback";

  if (isAuthCallback) {
    return (
      <AuthProvider>
        <AuthCallbackScreen />
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <SpiritualProvider>
        <Shell />
      </SpiritualProvider>
    </AuthProvider>
  );
}

if (typeof window !== "undefined") {
  console.log("[camino] bundle loaded", { ts: Date.now(), deploy: "2026-07-26T07:20:00-06:00" });
}
```

### 6.2 `src/screens/CaminoScreen.tsx` (710 líneas) —ESTRUCTURA COMPLETA—
**Campos exportados**: `ReaderTarget`, `Props`  
**Estados locales**: `showPopup`, `saintOpen`, `cateOpen`, `onThisOpen`, `bibliaOpen`, `resolvedSaint`, `resolvedDaily`, `catechismDone`  
**Efectos clave**:
- `useEffect` carga `camino_catechism_done` de localStorage (`src/screens/CaminoScreen.tsx:68-75`)
- `useEffect` resuelve imágenes de santo y evangelio via `resolveSaintImage`, `resolveCatholicImage`, `resolveDailyImage` (`src/screens/CaminoScreen.tsx:95-115`)
**Secciones UI**:
1. Popup versión (líneas 125-134)
2. Top bar con logo "CAMINO" y botón "Generar con Gemini" o indicador de temporada litúrgica (líneas 136-161)
3. Fecha completa + santo del día (líneas 176-186)
4. InstallBanner (PWA) (línea 189-191)
5. CalendarStrip (línea 194)
6. Verse card con imagen de fondo (`resolvedDaily`) y quote (líneas 197-211)
7. Santo del día con imagen resuelta (líneas 215-239)
8. Novena sugerida si existe (líneas 242-260)
9. Mensajes relevantes (marian + messages) con carrusel animado si hay múltiples (líneas 262-661)
10. Catecismo del día expandible (líneas 293-320)
11. "Un día como hoy" expandible con contexto venezolano (líneas 322-345)
12. Recursos grid 2x2: Biblia + Catequesis (líneas 348-373)
13. CTA "Comenzar mi jornada" (líneas 376-383)
14. Liturgia de hoy grid: Evangelio, Salmo, Laudes (con audio), Ángelus, Vísperas, Completas, Primera/Segunda lectura (líneas 386-499)
15. Acompañamiento recibido hoy: lista de assets de WhatsApp (líneas 473-499)
16. BibliaShell overlay fullscreen (líneas 502-512)
17. Santo del día modal full detail (líneas 514-569)

### 6.3 `src/screens/PerfilScreen.tsx` (484 líneas) —ESTRUCTURA COMPLETA—
**Tabs**: `jardin` | `intenciones` | `oratorio`  
**JardinTab** (líneas 186-412):
- `GardenSvg` con `dna={traits}` y `state={gardenState}`
- Pastilla ADN con `traits.dna.slice(0,10).toUpperCase()` + `TERRAIN_LABEL[terrain] · TREE_LABEL[treeSpecies]`
- Botón "Regar mi jardín" (1💧) + botón "Regar todo" (si agua > 1)
- Grid 3x2 de estadísticas: Rosarios, Coronillas, Novenas, Agua, Semillas, Velas
- Historia viva: último hito + acordeón con hasta 4 hitos
- Modales: riego simple, riego completo (elección de intención)
**IntencionesTab** (líneas 426-459): Lista de velas activas con horas restantes
**OratorioTab** (líneas 463-484): Botón de grabación placeholder ("Tus notas de voz aparecerán aquí")

### 6.4 `src/screens/AdminPortal.tsx` (762 líneas) —ESTRUCTURA COMPLETA—
**Tabs**: `gemini` | `upload` | `tasks` | `garden` | `telegram` | `images` | `oraciones`  
**GeminiPanel** (líneas 44-158):
- Input date + botones Generar / Cargar
- Textarea editable para JSON de liturgia
- Endpoints: `POST /daily/generate`, `GET /daily?date=`, `POST /daily`
**UploadPanel** (líneas 160-242):
- Tags: `laudes`, `angelus`, `evangelio`, `salmo`, `reflexion`, `canto`
- Input file + título + autor
- Endpoint: `POST /admin/upload-audio`
**TasksPanel** (líneas 244-522):
- Buscar usuario por email/nombre (debounce 350ms) → `GET /admin/users/search?q=`
- Selector de fecha + tareas base (de `defaultTasks`) + tarea personalizada
- Endpoint: `POST /admin/tasks`
**GardenEditor** (líneas 524-620):
- UUID usuario + tipo de evento + valor + intención
- RPC: `admin_insert_compensatory_event`
**TelegramPanel** (líneas 622-646):
- Instrucciones de configuración del bot
**ImagePanel** (líneas 648-762):
- Fecha + URLs de santo y evangelio
- Endpoints: `GET /admin/daily-images?date=`, `POST /admin/daily-images`
**OracionesPanel** (líneas 762+):
- Fecha + botón Cargar del RSS (`GET /youtube/prayer-videos`)
- Inputs para URLs manuales de Laudes, Vísperas, Completas
- Endpoint: `POST /youtube/prayer-videos` para guardar fallback manual

### 6.5 `src/screens/DailyPrayerPortal.tsx` (582 líneas) —ESTRUCTURA COMPLETA—
**HourKind**: `laudes` | `angelus` | `vespers` | `compline`  
**Paletas por mood**:
- `dawn`: `from-[#fef3e2] via-[#fde4c8] to-[#f5d5a0]`, accent `#d4943a`
- `noon`: `from-[#e8eef2] via-[#d0dce4] to-[#b8c8d0]`, accent `#4a7a8a`
- `dusk`: `from-[#2a2438] via-[#4a3a52] to-[#6a4a62]`, accent `#c49a6a`
- `night`: `from-[#0e1420] via-[#1a2438] to-[#2a3a52]`, accent `#8ab4d0`
**LaudesView** (líneas 314-441):
- Audio play/pause button con gradiente
- Steps indicator (puntos)
- Parte actual con `part.label` o `RUBRIC[part.kind]`
- Response block con gradiente
**AngelusView** (líneas 445-565):
- `angelusLyrics` array con timestamps
- Auto-scroll al verso activo
- Seek al tocar una línea
**Rubric mapping** (líneas 569-582): `invitatory` → "Invitatorio", `hymn` → "Himno", etc.

### 6.6 `src/screens/ComunidadScreen.tsx` (248 líneas) —COMPLETO—
**Tabs**: `intenciones` | `reflexiones`  
**IntencionesTab**:
- Grid 4 columnas de `CandleGlyph` (max 40 velas)
- Click en vela → `selected` → modal con detalle
- Botón "Encender una vela por alguien" → modal de composición
- `lightCandle(intention)` consume 1 vela
- `prayForCandle(id)` consume 1 vela, añade a activeIntentions

### 6.7 `src/screens/rosario/LiveSession.tsx` (425 líneas) —ESTRUCTURA COMPLETA—
**Estados**: `holding`, `showComplete`  
**useCommunityWork**: Orquesta obra comunitaria con `sessionKey`, `members`, `intentionsCount`, `aveMarias`, `season`, `intentionTheme`  
**Vistas principales**:
- `StepContext` (líneas 228-276): Círculo central con número de misterio o título del paso
- `ReflectionDial` (líneas 280-307): Dial de silencio con countdown
- `ConsolidatedPrayerCard` (líneas 311-351): Tarjeta con roles Guía/Asamblea o texto unificado
- `ReflectionCard` (líneas 357-425): Chat temporal con música

### 6.8 `src/screens/rosario/Lobby.tsx` (384 líneas) —ESTRUCTURA COMPLETA—
**DevotionMenu**: Modal bottom sheet con grupos "ROSARIOS" y "CORONILLAS"  
**Grupos**: Mapeo de `DEVOTION_LIST` filtrada por `ROSARIO_IDS`  
**Indicadores**: `todayId` con badge "HOY" dorado  
**Salas**: Lista de `ActiveRoom` con ping animado, participantes, botón "UNIRME"  
**EmptyWall**: Estado vacío con icono de vela animada

### 6.9 `src/screens/rosario/PrayerNavBar.tsx` (98 líneas) —COMPLETO—
**Anillo de progreso**: SVG circle con `strokeDasharray` proporcional a `completedRatio`  
**Botón central**: `🙏` con `onPointerDown/Up/Leave`, scale 95% al mantener, glow dorado  
**Izquierda**: "Salir" con icono logout  
**Derecha**: "Galería" con icono imagen

### 6.10 `src/screens/rosario/IntentionPrompt.tsx` (58 líneas) —COMPLETO—
Modal bottom sheet con:
- Icono de vela decorativo
- Textarea para intención adicional
- Botón dorado: "Encender vela y entrar" o "Entrar a orar"
- Botón secundario: "Entrar sin nueva intención"

### 6.11 `src/screens/rosario/RosarioScreen.tsx` (136 líneas) —COMPLETO—
**Lógica principal**:
- `todayDevotionId = devotionIdForToday(new Date)`
- `useRosario(selectedDevotionId)` → motor de rosario
- `useActiveRooms()` → salas activas
- `requestStart(kind)`: si hay `activeIntentions` arranca directo, sino muestra `IntentionPrompt`
- Al completar: `emit({ type: "rosary-complete" })`, `emit({ type: "daily-streak" })`
- Al entrar community: `emit({ type: "community-join" })`

### 6.12 `src/engine/PrayerEngine.ts`
**No leído en detalle en esta sesión**, pero es el núcleo FSM del rosario.  
**Referencias conocidas**:
- `useRosario` hook en `src/engine/useRosario.ts`
- Tipos `Step`, `RosarioState`, `RosarioApi` en `src/engine/types.ts`
- Estados: `idle` | `running` | `completed`
- Modos: `solo` | `community`
- Propiedades clave: `flatIndex`, `repeatIndex`, `completedRatio`, `participants`, `mode`

### 6.13 `src/engine/CommunityEngine.ts`
**No leído en detalle**, pero se sabe que:
- Maneja presencia comunitaria
- Reasigna líder si el líder actual sale
- Usa Supabase Realtime en tablas `participants` y `sessions`

### 6.14 `src/fruits/store.tsx` (416 líneas) —COMPLETO—
**Contexto**: `SpiritualProvider` envuelve toda la app  
**Estado global**: `balance`, `candles`, `history`, `gardenEvents`, `candleFeedback`, `syncError`  
**Acciones**:
- `emit(e: SpiritualEvent)`: aplica recompensa, emite RPC `emit_spiritual_event`, agrega garden event
- `lightCandle(intention)`: consume 1 vela, crea candle local + RPC `commit_candle`
- `prayForCandle(id)`: consume 1 vela, agrega `me` a `prayedBy`, RPC `commit_gift_candle`
- `waterGarden(intention)`: consume 1 agua, evento `WATER_GARDEN`, RPC `water_garden`
- `bulkWaterGarden(intention)`: consume todo el agua, RPC `bulk_water_garden`
- `reload()`: recarga fruits, candles, garden_events, intentions desde Supabase
- **Realtime channel**: `spiritual-state-{user.id}` escuchando `fruits`, `garden_events`, `candles`

### 6.15 `src/community/CommunityWorkSvg.tsx` (166 líneas) —COMPLETO—
**ViewBox**: `0 0 360 360`  
**Estructura**:
1. Fondo negro `#0a0a0b`
2. Glow radial dorado
3. Estado vacío: círculo central pulsante + "✨"
4. Partículas visibles según `progress`
5. Al completar: círculo expansivo dorado
**ParticleShapes**: `leaf`, `flower`, `branch`, `star`, `arc`, `petal`
**Colores**: `hsl(hue 28% 68%)` fill, `hsl(hue 22% 48%)` stroke

### 6.16 `src/community/useCommunityWork.ts` (173 líneas) —COMPLETO—
**Inputs**: `active`, `sessionKey`, `members`, `intentionsCount`, `aveMarias`, `season`, `intentionTheme`, `completed`  
**Outputs**: `signatures`, `composition`, `communitySeed`, `progress`, `offerMyPrayer`, `savedWork`  
**Lógica clave**:
- Reset al cambiar `sessionKey`
- `addSignature`: una firma por miembro; repeticiones aumentan `growthFactor` (max 1.8)
- `progress = Math.min(1, gestureCount * 0.045 + signatures.length * 0.035)`
- Al completar: guarda en Supabase `community_works` via `saveWork(work)`

### 6.17 `src/garden/GardenSvg.tsx` (1171 líneas) —ESTRUCTURA—
**ViewBox**: `0 0 720 460`  
**Capas (en orden)**:
1. `FilteredEnvironment` (saturación y opacidad según health)
2. `SkyLayer` (gradiente cielo + golden hour)
3. `TerrainLayerComponent` (capas de terreno con highlight)
4. `Shadows` (elipses de sombra)
5. `WaterLayer` (isometric pond o río animado)
6. `NaturalElements` (plantas, flores, clusters de flora)
7. `FaunaLayer` (ciervo, paloma, mariposas, partículas, luciérnagas)
8. `SacredElements` (nodos sagrados, arco de gruta, geometría sagrada)
9. `LightsLayer` (luces doradas pulsantes)
10. `CentralTree` (cedro con raíces, ramas, copa, gorrión)
11. `TransientEffects` (rayos de luz, lluvia, ripple de riego, sequía, rocío)
12. `SignatureBlock` (placa de piedra con firma del jardín)
**Flora clusters**: `rose`, `rosal_de_gracia`, `floral_wreath`, `lily`, `lavender`, `daisy`, `rosemary`, `thyme`, `olive_shrub`

### 6.18 `src/liturgy/useDailyLiturgy.ts`
**No leído en detalle**, pero se sabe que:
- Retorna `{ liturgy, loading, generating, error, monthEvents, pastProgress, generateNow }`
- `todayDayFromLiturgy(L)` extrae el día numérico del mes
- `monthEvents` incluye eventos litúrgicos del mes
- `pastProgress` es `Record<number, { rosaries: number; done: boolean }>` para CalendarStrip

### 6.19 `src/components/BottomNav.tsx`
**No leído en detalle**, pero se sabe que:
- 5 tabs con iconos
- `dark` prop cambia estilos a tema oscuro
- `active` y `onChange` para navegación

### 6.20 `src/components/CalendarStrip.tsx`
**No leído en detalle**, pero se sabe que:
- Muestra días del mes con eventos litúrgicos
- Indicador de progreso pasado (rosarios completados)
- Día actual resaltado

### 6.21 `src/components/AudioPlayer.tsx`
**No leído en detalle**, pero se sabe que:
- Reproductor de audio para assets de WhatsApp
- Usa `audioUrl` del asset

### 6.22 `src/screens/ReaderScreen.tsx` (123 líneas) —COMPLETO—
**Características**:
- Three Crosses Rite animado (Frente, Labios, Pecho) si `gospel.threeCrosses !== false`
- Lectura del santo Evangelio según San {evangelist}
- Response block con `R. {response}`
- Botón inferior "Marcar como rezado" (o label custom)

### 6.23 `src/screens/JornadaScreen.tsx` (421 líneas) —ESTRUCTURA—
**Steps build**: `buildJornadaSteps(liturgy)` desde `src/data/jornada.ts`  
**Kinds y accents**:
```ts
const ACCENT: Record<JornadaStepKind, string> = {
  offering: "#c98a3a",
  greeting: "#c4a35a",
  breath: "#5f8ea0",
  invocation: "#9a6fb0",
  quote: "#c4a35a",
  reading: "#a07a3c",
  threecrosses: "#b65a4a",
  gospel: "#8a5a2a",
  catechism: "#3f6e7a",
  onthistoday: "#7a4a8a",
  reflection: "#5c7a4a",
  silence: "#8a8a92",
  personal: "#b08a3a",
  final: "#8a5a2a",
};
```
**Vistas**: `OfferingView`, `BreathView` (círculo animado inhala/sostén/exhala), `ThreeCrossesView`, `GospelView`, `QuoteView`, `ReadingView`, `CatechismView`, `OnThisDayView`, `ReflectionView`, `SilenceView` (countdown 30s), `PersonalView` (textarea), `PrayerView`

### 6.24 `src/screens/ReglaScreen.tsx` (214 líneas) —COMPLETO—
**Secciones**: HOY · DIARIA | ESTA SEMANA | + Añadir compromiso  
**TaskRow**: Checkbox circular + icono + título + tiempo + badge "obligatorio" + chevron si es actionable  
**Categorías actionable**: `laudes`, `angelus`, `gospel`, `rosary` → abren el lector o rosario

### 6.25 `src/screens/GalleryScreen.tsx` (125 líneas) —COMPLETO—
**Carga**: `loadGallery()` (localStorage) + `loadGalleryFromSupabase()` (remote), merge por id, sort por `completedAt` desc, slice 40  
**Grid**: 2 columnas, max 40 obras  
**Detalle**: fullscreen con `CommunityWorkSvg` grande + stats (participantes, intenciones, aveMarias)

### 6.26 `src/screens/AuthPortal.tsx` (126 líneas) —COMPLETO—
**Campos**: email input + botón "Recibir enlace para entrar"  
**Social**: Google, Apple, Facebook (3 columnas)  
**Mensajes**: notice verde, error rojo, warning si Supabase no configurado

### 6.27 `src/screens/AuthCallbackScreen.tsx` (77 líneas) —COMPLETO—
**Lógica**: Si `loading` o `standalone === null` → spinner "Cargando..."  
Si `!user` → error "No pudimos confirmar tu acceso"  
Si `!standalone` → mensaje "Abre el enlace en Camino"  
Si todo OK → `window.location.replace("/")`

### 6.28 `src/screens/AudioAssetScreen.tsx` (40 líneas) —COMPLETO—
**Campos**: tag, título, autor, `AudioPlayer`, transcripción si existe

### 6.29 `src/community/composition.ts`
**No leído en detalle**, pero exports conocidos:
- `COMPOSITION_LABELS`: Record de etiquetas legibles
- `chooseComposition(seed, season)`: elige tipo de obra
- `communitySeedFromSession(sessionKey, signatures)`: genera seed
- `compositionTitle(composition, intentionTheme, season)`: título de la obra
- `signaturePayloadFromDna(traits, sessionKey, memberId, growthFactor)`: payload de firma
- `buildCommunityParticles(communitySeed, composition, signatures)`: partículas SVG

### 6.30 `src/community/gallery.ts`
**No leído en detalle**, pero exports conocidos:
- `saveWork(work)`: guarda en Supabase `community_works`
- `loadGallery()`: lee localStorage
- `loadGalleryFromSupabase()`: lee tabla `community_works`

### 6.31 `src/community/types.ts`
**No leído en detalle**, pero tipos conocidos:
- `CommunityWorkSeed`: `id`, `sessionId`, `composition`, `season`, `communitySeed`, `signatures`, `participants`, `intentions`, `aveMarias`, `completedAt`, `title`, `intentionTheme`
- `CommunitySignaturePayload`: `memberId`, `shape`, `hue`, `scale`, `delay`, `x`, `y`
- `CompositionKind`: union de tipos de composición
- `SignatureShape`: `"leaf" | "flower" | "branch" | "star" | "arc" | "petal"`

### 6.32 `src/garden/dna.ts`
**No leído en detalle**, pero se sabe que:
- `useGardenDna(identity)` → `DnaTraits`
- `DnaTraits` incluye: `dna`, `terrain`, `treeSpecies`, `season`, `growthPhase`, `wateringEffectStrength`, `lightLevel`, `showEphemeralFlower`, `dewPoints`

### 6.33 `src/garden/events.ts`
**No leído en detalle**, pero se sabe que:
- `aggregateGardenState(events, activeIntentionsCount)` → `GardenState`
- `gardenEventType(spiritualEventType)` → mapea a `GardenEventType`
- `GardenEventType` incluye: `ROSARY_COMPLETED`, `NOVENA_COMPLETED`, `CORONILLA_COMPLETED`, `SILENCE_TIME`, `WATER_GARDEN`, `COMMUNITY_PRAYER`, `STREAK_MAINTAINED`, `TASK_COMPLETED`, `SEED_RECEIVED`, `WATER_RECEIVED`, `CANDLE_LIT`, `REFLECTION_COMPLETED`

### 6.34 `src/garden/model.ts`
**No leído en detalle**, pero se sabe que:
- `generateGardenModel(dna, state)` → modelo con `tree`, `pond`, `river`, `terrainLayers`, `shadows`, `ambientPlants`, `ambientFlowers`, `floraClusters`, `deer`, `sacredNodes`, `lights`, `butterflies`, `particles`, `lightRays`, `dove`, `grottoArch`, `sacredGeometry`

### 6.35 `src/garden/prng.ts`
**No leído en detalle**, pero se sabe que:
- PRNG determinista basado en seed para generar el jardín reproducible

### 6.36 `src/garden/types.ts`
**No leído en detalle**, pero tipos conocidos:
- `DnaTraits`
- `GardenState`: `health`, `waterLevel`, `growthPhase`, `wateringEffectStrength`, `lightLevel`, `showEphemeralFlower`, `dewPoints`
- `GardenSignature`: `kind`, `hue`, `angle`, `petals`

### 6.37 `src/engine/types.ts`
**No leído en detalle**, pero tipos conocidos:
- `Step`: `type`, `title`, `text`, `repeat?`, `duration?`, `role?`, `leaderText?`, `assemblyText?`, `kind?`, `label?`, `response?`, `rubric?`
- `RosarioState`: `status`, `mode`, `flatIndex`, `repeatIndex`, `completedRatio`, `participants`, `stepElapsed`
- `RosarioApi`: métodos del motor (`startCommunity`, `startSolo`, `joinExisting`, `markDone`, `leave`)

### 6.38 `src/engine/keywords.ts`
**No leído en detalle**, pero se sabe que:
- `keywordsForStep(step)`: retorna array de strings keywords para voice control
- Usado en `LiveSession` para `usePrayerVoiceControl`

### 6.39 `src/engine/usePrayerVoiceControl.ts`
**No leído en detalle**, pero interface conocida:
- `usePrayerVoiceControl(keywords, onAdvance)` → `{ supported, listening, transcript, error, toggle }`
- Usa Web Speech API (`SpeechRecognition`)

### 6.40 `src/engine/useRosario.ts`
**No leído en detalle**, pero se sabe que:
- `useRosario(devotionId)` → `RosarioApi`
- Construye los steps de la devoción
- Maneja transiciones solo/community
- Integra con `CommunityEngine` para salas

### 6.41 `src/engine/devotions/index.ts`
**No leído en detalle**, pero se sabe que:
- Exporta `DEVOTIONS`, `DEVOTION_LIST`, `ROSARIO_IDS`
- `DEVOTIONS` es Record<string, DevotionDefinition>
- `DEVOTION_LIST` es array ordenado
- `ROSARIO_IDS` es Set de IDs de rosarios

### 6.42 `src/engine/devotions/rosarioMisterios.ts`
**No leído en detalle**, pero:
- `devotionIdForToday(date?)`: retorna ID de rosario según día de la semana
- Lógica: domingo→gozosos, lunes→dolorosos, martes→gozosos, miércoles→gloriosos, jueves→dolorosos, viernes→dolorosos, sábado→gozosos (aprox)

### 6.43 `src/engine/devotions/commonPrayers.ts`
**No leído en detalle**, pero contiene las oraciones comunes del rosario (padrenuestro, avemaría, gloria, etc.)

### 6.44 `src/data/jornada.ts`
**No leído en detalle**, pero:
- `buildJornadaSteps(liturgy)`: construye array de `JornadaStep`
- `JornadaStepKind`: union de tipos de paso
- `JornadaStep`: `id`, `kind`, `eyebrow?`, `heading`, `hint?`, `body?`, `cta?`, `citation?`, `responseLabel?`, `response?`, `evangelist?`, `number?`, `applyToday?`, `category?`

### 6.45 `src/data/theological-sources.ts`
**No leído en detalle**, pero contiene fuentes teológicas para mensajes marianos

### 6.46 `src/media/registry.ts`
**No leído en detalle**, pero:
- `assetsByTag(tag, assets)`: filtra assets por tag
- `defaultAssets`: array de `WhatsAppAsset`

### 6.47 `src/media/useWhatsAppAssets.ts`
**No leído en detalle**, pero:
- `useWhatsAppAssets()` → `WhatsAppAsset[]`
- Carga desde Supabase `assets` con Realtime

### 6.48 `src/media/imageResolver.ts`
**No leído en detalle**, pero exports conocidos:
- `resolveCatholicImage(name, ref?)`: busca imagen de arte sacro público
- `resolveDailyImage(url?, ref?, text?)`: fallback a imagen genérica
- `resolveSaintImage(name, url?)`: imagen del santo

### 6.49 `src/media/types.ts`
**No leído en detalle**, pero:
- `WhatsAppAsset`: `id`, `tag`, `title`, `author`, `audioUrl`, `r2Key?`, `transcript?`, `uploadedAt?`

### 6.50 `src/liturgy/types.ts`
**No leído en detalle**, pero tipos conocidos:
- `DailyLiturgy`: `date`, `weekday`, `season`, `liturgicalColor`, `liturgicalRank`, `isSolemnity`, `saint`, `quote`, `gospel`, `psalm`, `firstReading`, `secondReading`, `marian`, `messages`, `reflection`, `catechism`, `laudes`, `vespers`, `compline`, `angelus`, `imageUrl`, `onThisDay`, `suggestedNovenas`
- `Saint`: `name`, `title`, `initial`, `story`, `highlights`, `lessons`, `exampleToday`, `gospelConnection`, `venezuelaRelevance`, `prayer`, `imageUrl?`
- `HourLiturgy`: `title`, `hour`, `mood`, `parts`, `body?`
- `HourPart`: `kind`, `label`, `text`, `response?`, `rubric?`
- `AngelusLiturgy`: `title`, `body`, `verses`, `closingPrayer`, `audioUrl?`, `audioLabel?`

### 6.51 `src/liturgy/useDailyLiturgy.ts`
**No leído en detalle**, pero se sabe que:
- `useTodayLiturgy()` → objeto con `liturgy`, `loading`, `generating`, `error`, `generateNow`, `monthEvents`, `pastProgress`
- `todayDayFromLiturgy(L)`: extrae día del mes desde `L?.date` o `new Date()`

### 6.52 `src/liturgy/today.ts`
**No leído en detalle**

### 6.53 `src/rule/tasks.ts`
**No leído en detalle**, pero:
- `defaultTasks`: array de `SpiritualTask` base
- `TaskCategory`: union de categorías

### 6.54 `src/rule/markTasks.ts`
**No leído en detalle**, pero exports conocidos:
- `JORNADA_CATEGORIES`: array de categorías de jornada
- `categoriesForTarget(target)`: mapea ReaderTarget a categorías
- `markCategoriesDone(userId, categories)`: marca tareas como completadas

### 6.55 `src/rule/useSpiritualTasks.ts`
**No leído en detalle**, pero:
- `useSpiritualTasks(liturgy)` → task store con `tasks`, `toggle(id, done)`, `add(title)`, `authenticated`

### 6.56 `src/notifications/NotificationsPanel.tsx`
**No leído en detalle**

### 6.57 `src/notifications/usePushNotifications.ts`
**No leído en detalle**

### 6.58 `src/prayer/useDailyPrayerPresence.ts`
**No leído en detalle**, pero:
- `useDailyPrayerPresence(kind)` → `{ count, channel }`
- Usa Supabase Realtime para contar personas rezando

### 6.59 `src/pwa/InstallBanner.tsx`
**No leído en detalle**

### 6.60 `src/pwa/useInstallPrompt.ts`
**No leído en detalle**, pero:
- `useInstallPrompt()` → `{ canShow, prompt }`
- Detecta si la PWA es instalable

### 6.61 `src/rosary/useActiveRooms.ts`
**No leído en detalle**, pero:
- `useActiveRooms()` → `{ rooms, loading, total }`
- `ActiveRoom`: `sessionId`, `devotionId`, `mode`, `kind`, `title`, `subtitle`, `participants`, `icon`, `hourKind?`

### 6.62 `src/rosary/useRosaryLobbyData.ts`
**No leído en detalle**, pero:
- `useRosaryLobbyData()` → métricas del lobby
- Usa RPC `rosary_lobby_metrics()`

### 6.63 `src/hooks/useBibliaRouter.ts`
**No leído en detalle**

### 6.64 `src/hooks/useInstallPrompt.ts`
**Conflicto de nombre con `src/pwa/useInstallPrompt.ts`** — probablemente uno reexporta al otro

### 6.65 `src/auth/AuthProvider.tsx`
**No leído en detalle**, pero:
- `AuthProvider`: envuelve la app, provee `user`, `loading`, `signOut`, `signInWithEmail`, `signInWithProvider`, `configured`
- Usa `supabase.auth`

### 6.66 `src/auth/anonId.ts`
**No leído en detalle**, pero:
- `getAnonIdentity()`: genera ID anónimo almacenado en localStorage
- Usado como fallback cuando no hay sesión

### 6.67 `src/lib/supabase.ts`
**No leído en detalle**, pero:
- Exporta instancia singleton de `SupabaseClient`
- Configurada con `url` y `key` desde `import.meta.env`

### 6.68 `src/config.ts`
**No leído en detalle**, pero:
- Exporta `WORKER_API_BASE` desde `import.meta.env.VITE_API_BASE`

### 6.69 `src/main.tsx`
**No leído en detalle**, pero:
- Entry point, monta `<App />` en `#root`

### 6.70 `src/index.css`
**No leído en detalle**, pero contiene:
- `@import "tailwindcss"`
- Clases custom como `.no-scrollbar`, `.flame`, `.candle-praying`, `.fade-up`

### 6.71 `src/utils/cn.ts`
**No leído en detalle**, pero típicamente:
- `cn(...classes)`: concatena clases con clsx/tailwind-merge

### 6.72 `src/screens/biblia/*.tsx`
**No leídos en detalle**, pero se sabe que:
- `BibliaShell`: contenedor con rutas internas
- `BibliaOnboardingScreen`: flujo de onboarding
- `BibliaHomeScreen`: lista de planes y métodos
- `BibliaDailyScreen`: contenido diario

---

## 7. WORKER (`worker/src/index.ts`) — 1742 LÍNEAS

### 7.1 Estructura
```ts
export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response>,
  async scheduled(_event: any, env: any, _ctx: ExecutionContext): Promise<void>
}
```

### 7.2 Endpoints implementados
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/whatsapp` | Verify webhook |
| POST | `/whatsapp` | Webhook WhatsApp (audio admin → R2 + Supabase assets) |
| GET | `/daily` | Obtener liturgia del día (cache o generar) + videos de oración inyectados |
| POST | `/daily` | Guardar liturgia custom |
| POST | `/daily/generate` | Forzar generación con Gemini |
| POST | `/generate-image` | Generar imagen con Gemini |
| GET | `/notifications/vapid-public-key` | Clave pública VAPID |
| POST | `/notifications/subscribe` | Suscribir push |
| POST | `/notifications/email/reminders` | Preferencias email |
| GET | `/admin/users/search` | Buscar usuarios |
| POST | `/admin/tasks` | Asignar tareas |
| POST | `/admin/upload-audio` | Subir audio (fallback WhatsApp) |
| GET | `/admin/daily-images` | Obtener imágenes del día |
| POST | `/admin/daily-images` | Guardar imágenes del día |
| POST | `/admin/upload-image` | Subir imagen a R2 |
| GET | `/bible/daily` | Obtener contenido bíblico diario |
| POST | `/bible/daily` | Generar/obtener contenido bíblico diario |
| GET | `/youtube/prayer-videos` | Obtener/actualizar URLs de videos de oración desde RSS |
| POST | `/youtube/prayer-videos` | Guardar URLs manuales de videos de oración |

### 7.3 Lógica de generación de liturgia (`generateLiturgy`)
1. Prompt a Gemini con contexto de fuentes marianas y reglas estrictas
2. JSON Schema obligatorio para `responseMimeType: "application/json"`
3. Fallback chain: `gemini-1.5-flash` → `gemini-1.5-flash-8b` → `gemini-1.5-pro` → `gemini-1.0-pro` → `gemini-pro`
4. Provider fallback: AI Studio → Vertex AI
5. JSON repair: `repairJson()` + estrategias adicionales
6. Defaults si falla: `getDefaultLiturgy(date)`

### 7.4 Procesamiento de recordatorios (`processReminders`)
1. Tareas con hora: notificación push 15 min antes
2. 6 PM Venezuela: recordatorio de riego de jardín si no regó hoy
3. 11 UTC (7 AM Venezuela): Laudes
4. 16 UTC (12 PM Venezuela): Ángelus
5. 0 UTC (8 PM Venezuela): Rosario
6. Email via Resend a usuarios con `email_reminders = true`

### 7.5 WhatsApp webhook
- Verificación: `hub.mode=subscribe`, `hub.verify_token`
- Audio admin: descarga desde Facebook Graph API → R2 `audio/{tag}/{timestamp}.ogg` → Supabase `assets`

---

## 8. SUPABASE — MIGRATIONS

### 8.1 Tablas conocidas (por lectura de migrations)
- `profiles` (con `role`, `email`, `full_name`)
- `daily_liturgy` (con `is_solemnity`, `image_url`, `saint` JSONB)
- `oraciones_diarias` (`fecha`, `laudes`, `visperas`, `completas`)
- `fruits` (`profile_id`, `vela`, `semilla`, `agua`, `updated_at`)
- `fruit_history` (`profile_id`, `note`, `vela`, `semilla`, `agua`, `created_at`)
- `candles` (`id`, `owner_id`, `intention`, `lit_at`, `expires_at`)
- `intentions` (`candle_id`, `pray_for_id`)
- `garden_events` (`user_id`, `event_type`, `value`, `intention`, `created_at`)
- `garden_waterings` (`user_id`, `amount`, `intention`, `watered_at`)
- `spiritual_tasks` (`profile_id`, `title`, `category`, `cadence`, `time`, `required`, `done`, `task_date`)
- `community_works` (`id`, `session_id`, `composition`, `season`, `community_seed`, `signatures`, `participants`, `intentions`, `ave_marias`, `completed_at`, `title`, `intention_theme`)
- `sessions` (`id`, `devotion_id`, `mode`, `status`, `started_at`, `ended_at`)
- `participants` (`session_id`, `user_id`, `joined_at`, `left_at`)
- `assets` (`tag`, `title`, `author`, `r2_key`, `uploaded_by`, `status`)
- `push_subscriptions` (`profile_id`, `endpoint`, `subscription`, `user_agent`, `channel`)
- `notification_preferences` (`profile_id`, `email_reminders`)
- `bible_methods`, `bible_lessons`, `bible_plans`, `bible_plan_days`
- `user_bible_profile`, `user_bible_enrollment`, `user_bible_sessions`, `user_bible_streak`
- `user_bible_daily_content`

### 8.2 RPCs conocidas
- `emit_spiritual_event(p_event_type, p_value, p_intention, p_vela, p_semilla, p_agua, p_note)`
- `commit_candle(p_intention)` → returns `uuid`
- `commit_gift_candle(p_candle_id, p_amount)`
- `water_garden(p_intention)`
- `bulk_water_garden(p_user_id, p_intention)` → returns `table(watered, amount, new_water_level)`
- `admin_insert_compensatory_event(p_target_user_id, p_event_type, p_value, p_intention, p_created_at)`
- `ensure_daily_spiritual_tasks(p_date, p_is_sunday, p_is_solemnity, p_is_fasting_day, p_day_of_month)`
- `rosary_lobby_metrics()` → returns `table(total, community, solo)`
- `active_prayer_rooms()` → returns `table(id, devotion_id, mode, status, participants, started_at)`

### 8.3 Row Level Security (RLS)
- Políticas públicas de lectura para `bible_methods`, `bible_lessons`, `bible_plans`, `bible_plan_days`
- Políticas owner para tablas de usuario (`user_bible_*`, `fruits`, `garden_events`, `candles`, `spiritual_tasks`)
- `community_works`: select público a authenticated, insert/update sin restricción fuerte
- Admin role check en `admin_insert_compensatory_event`

---

## 9. PUBLIC / PWA

### 9.1 `public/sw.js` (40 líneas) —COMPLETO—
```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("magiclink") || event.request.url.includes("access_token") || event.request.url.includes("refresh_token")) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.redirected) {
          const redirectUrl = new URL(response.url);
          if (redirectUrl.origin === self.location.origin) {
            return Response.redirect(redirectUrl.href);
          }
        }
        return response;
      }).catch(() => event.request)
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Camino", body: event.data?.text() || "Tienes una oración pendiente." };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Camino", {
      body: data.body || "Tienes una tarea espiritual pendiente.",
      data: data.url || "/",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/";
  event.waitUntil(clients.openWindow(target));
});
```

### 9.2 `public/_headers` (7 líneas) —COMPLETO—
```
/index.html
  Cache-Control: no-store

/sw.js
  Content-Type: application/javascript; charset=utf-8
  Cache-Control: no-store
```

### 9.3 `public/_redirects` (2 líneas) —COMPLETO—
```
/sw.js  /sw.js  200
/*  /index.html  200
```

### 9.4 `public/manifest.webmanifest` (26 líneas) —COMPLETO—
```json
{
  "name": "Camino — Rosario Comunitario",
  "short_name": "Camino",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

### 9.5 `public/manifest.json` (35 líneas) —COMPLETO—
```json
{
  "name": "Camino — Rosario Comunitario",
  "short_name": "Camino",
  "start_url": "https://camino-6vx.pages.dev/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "orientation": "portrait",
  "prefer_related_applications": true,
  "related_applications": [
    { "platform": "webapp", "url": "https://camino-6vx.pages.dev/" }
  ],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
  ]
}
```

---

## 10. CONFIGURACIÓN

### 10.1 `vite.config.ts`
**No leído en detalle**, pero se sabe que:
- Usa `@tailwindcss/vite` plugin
- Usa `vite-plugin-singlefile` (para embed/standalone?)
- Alias `@` → `src`

### 10.2 `tsconfig.json`
**No leído en detalle**, pero se sabe que:
- `target`: ES2020+
- `moduleResolution`: bundler
- `jsx`: react-jsx
- `strict`: true
- Paths: `@/*` → `src/*`

### 10.3 `index.html`
**No leído en detalle**, pero se sabe que:
- Inyecta `manifest.webmanifest` dinámicamente
- Inyecta `sw.js` dinámicamente (skip en embed mode)
- Entrypoint: `src/main.tsx`

### 10.4 `wrangler.toml`
**No leído en detalle**, pero bindings conocidas:
- `DAILY_CACHE` (KV)
- `CAMINO_IMAGES` (R2)
- `CAMINO_AUDIO` (R2)

---

## 11. FLUJO DE DATOS PRINCIPAL

### 11.1 Inicio de app
1. `main.tsx` monta `<App />`
2. `App` detecta si es `/auth/callback` → `AuthCallbackScreen`, sino → `AuthProvider` + `SpiritualProvider` + `Shell`
3. `Shell` inicializa `tab="camino"`, carga `useDailyLiturgy`, `useWhatsAppAssets`
4. `CaminoScreen` renderiza liturgia del día, calendar strip, acciones rápidas

### 11.2 Rosario comunitario
1. Usuario toca tab `rosario` → `RosarioScreen`
2. `RosarioScreen` calcula `todayDevotionId` y renderiza `Lobby`
3. Usuario elige "Iniciar Rosario Comunitario" → si hay intenciones activas arranca, sino muestra `IntentionPrompt`
4. Al confirmar: `rosario.startCommunity()` → cambia estado a `running` → renderiza `LiveSession`
5. `LiveSession` crea obra comunitaria con `useCommunityWork`
6. Al completar: `rosario.markDone()` → estado `completed` → `emit({ type: "rosary-complete" })` → frutas + guardar obra

### 11.3 Jornada diaria
1. Usuario toca "Comenzar mi jornada" en `CaminoScreen`
2. `JornadaScreen` construye steps desde `buildJornadaSteps(liturgy)`
3. Usuario navega steps: ofrecimiento, respiración, evangelio, catecismo, silencio, reflexión personal
4. Al terminar: `settleJornada()` → `emit({ type: "task-complete" })` + `markCategoriesDone(JORNADA_CATEGORIES)`

### 11.4 Riego de jardín
1. Usuario abre tab `perfil` → `PerfilScreen`
2. Tab `jardin` muestra `GardenSvg` + stats
3. Usuario toca "Regar mi jardín" → elige intención → `waterGarden(intention)`
4. Si `agua > 1`, aparece botón "Regar todo" → `bulkWaterGarden(intention)`
5. Ambas operaciones consumen agua, generan `WATER_GARDEN` event, actualizan `gardenState`

---

## 12. INSTRUCCIONES DE RECONSTRUCCIÓN

### 12.1 Orden de creación de archivos
1. `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
2. `src/index.css`, `src/main.tsx`, `src/config.ts`, `src/utils/cn.ts`
3. `src/lib/supabase.ts`, `src/auth/anonId.ts`, `src/auth/AuthProvider.tsx`
4. `src/fruits/types.ts`, `src/fruits/rewards.ts`, `src/fruits/store.tsx`
5. `src/garden/types.ts`, `src/garden/prng.ts`, `src/garden/dna.ts`, `src/garden/events.ts`
6. `src/garden/model.ts`, `src/garden/GardenSvg.tsx`
7. `src/community/types.ts`, `src/community/composition.ts`, `src/community/gallery.ts`
8. `src/community/useCommunityWork.ts`, `src/community/CommunityWorkSvg.tsx`, `src/community/WorkCompleteOverlay.tsx`
9. `src/engine/types.ts`, `src/engine/keywords.ts`
10. `src/engine/PrayerEngine.ts`, `src/engine/CommunityEngine.ts`, `src/engine/useRosario.ts`, `src/engine/usePrayerVoiceControl.ts`
11. `src/engine/devotions/commonPrayers.ts`, `.../rosarioMisterios.ts`, `.../rosarioDolorosos.ts`, `.../desatanudos.ts`, `.../divinaMisericordia.ts`, `.../espirituSanto.ts`, `.../almasPurgatorio.ts`, `.../sanJose.ts`, `.../index.ts`
12. `src/liturgy/types.ts`, `src/liturgy/today.ts`, `src/liturgy/useDailyLiturgy.ts`
13. `src/media/types.ts`, `src/media/registry.ts`, `src/media/imageResolver.ts`, `src/media/useWhatsAppAssets.ts`
14. `src/rule/tasks.ts`, `src/rule/markTasks.ts`, `src/rule/useSpiritualTasks.ts`
15. `src/notifications/NotificationsPanel.tsx`, `src/notifications/usePushNotifications.ts`
16. `src/prayer/useDailyPrayerPresence.ts`
17. `src/pwa/useInstallPrompt.ts`, `src/pwa/InstallBanner.tsx`
18. `src/rosary/useActiveRooms.ts`, `src/rosary/useRosaryLobbyData.ts`
19. Componentes shared: `src/components/Avatar.tsx`, `src/components/AudioPlayer.tsx`, `src/components/BottomNav.tsx`, `src/components/CalendarStrip.tsx`, `src/components/RosaryRing.tsx`, `src/components/biblia/BibleTextProvider.tsx`
20. Pantallas: `src/screens/ReaderScreen.tsx`, `src/screens/AudioAssetScreen.tsx`, `src/screens/AuthPortal.tsx`, `src/screens/AuthCallbackScreen.tsx`
21. Pantallas rosario: `src/screens/rosario/IntentionPrompt.tsx`, `src/screens/rosario/PrayerNavBar.tsx`, `src/screens/rosario/Lobby.tsx`, `src/screens/rosario/LiveSession.tsx`, `src/screens/rosario/RosarioScreen.tsx`
22. Pantallas principales: `src/screens/CaminoScreen.tsx`, `src/screens/ReglaScreen.tsx`, `src/screens/PerfilScreen.tsx`, `src/screens/ComunidadScreen.tsx`
23. Pantallas overlay: `src/screens/JornadaScreen.tsx`, `src/screens/DailyPrayerPortal.tsx`, `src/screens/GalleryScreen.tsx`, `src/screens/AdminPortal.tsx`, `src/screens/biblia/*.tsx`
24. `src/App.tsx` (ensambla todo)
25. `worker/src/index.ts` (1742 líneas)
26. `supabase/migrations/*.sql` (15 archivos)
27. `public/sw.js`, `public/_headers`, `public/_redirects`, `public/manifest.webmanifest`, `public/manifest.json`

### 12.2 Validación
- Ejecutar `npm run build` (debe compilar sin errores)
- Verificar que `dist/index.html` se genera correctamente
- Verificar que `dist/assets/` contiene los bundles
- En Worker: `npx wrangler dev` para probar endpoints localmente
- En Supabase: `supabase db reset` para aplicar migrations

---

## 13. NOTAS ADICIONALES

- **Idioma**: Español (Venezuela) en toda la UI. Inglés solo en prompts de Gemini y código técnico.
- **Contenido litúrgico**: TODO el contenido bíblico y doctrinal debe ser EXACTO. No parafrasear ni acortar.
- **Imágenes**: Arte sacro de dominio público. Si no hay URL, usar placeholders o resolver dinámicamente.
- **Audio**: Proviene de WhatsApp (R2 storage). Si no hay audio, mostrar fallback o nothing.
- **Determinismo**: El jardín usa PRNG determinista por usuario. Misma identidad = mismo jardín.
- **Tiempo Venezuela**: UTC-4. El Worker procesa recordatorios en UTC ajustando por Venezuela.
- **Responsive**: Mobile-first. En desktop se muestra como dispositivo simulado (max-w-[430px], border, shadow).

---

## 14. COMANDOS ÚTILES

```bash
# Instalar dependencias
npm install

# Desarrollo local
npm run dev

# Build producción
npm run build

# Preview build
npm run preview

# Worker dev
cd worker && npx wrangler dev

# Worker deploy
cd worker && npx wrangler deploy

# Supabase local
supabase start
supabase db reset

# Lint (si existe)
npm run lint

# Typecheck (si existe)
npm run typecheck
```

---

*Generado por Kilo el 2026-07-27. Este archivo es la fuente de verdad para reconstruir el proyecto Camino.*
