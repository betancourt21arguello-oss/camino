# Funciones del Jardín del Perfil de Usuario

## Introducción

El jardín del perfil de usuario es una representación visual en SVG del crecimiento espiritual de un usuario en la aplicación Camino. Es determinista, reproducible y 100% renderizado en el frontend. El backend solo almacena un registro inmutable de eventos; todo el gráfico se genera proceduralmente en el cliente combinando:

- Una identidad digital permanente (DNA), derivada de un hash SHA-256 del ID de usuario o UUID anónimo.
- Un historial de eventos espirituales (oraciones, tareas, velas, oraciones comunitarias, etc.).
- Un modelo de estado agregado (nivel de agua, luz, salud, madurez, fase de crecimiento).

---

## 1. Mapa de Archivos Contribuyentes

### 1.1 Motor Central del Jardín (`src/garden/`)

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `types.ts` | `src/garden/types.ts` | Define todos los tipos del sistema: `DnaTraits`, `GardenEventType`, `GardenEvent`, `GardenState`, `GardenSignature`. Es el contrato de datos compartido por todo el módulo. |
| `dna.ts` | `src/garden/dna.ts` | Calcula el DNA permanente y determinista del jardín a partir de la identidad del usuario (`computeDna` + `deriveDnaTraits`). Expone el hook `useGardenDna`. |
| `prng.ts` | `src/garden/prng.ts` | Generador pseudoaleatorio determinista (Mulberry32) y ruido 1D para geometría orgánica. Garantiza que el mismo DNA siempre produzca la misma forma. Nunca usa `Math.random()`. |
| `events.ts` | `src/garden/events.ts` | Mapea eventos espirituales a eventos de jardín y agrega el estado completo. Contiene `aggregateGardenState` (nivel de agua, luz, salud, nivel, fase de crecimiento, etc.). |
| `model.ts` | `src/garden/model.ts` | Genera toda la geometría del jardín (terreno, árbol, estanque, flora, rocas, animales, elementos sagrados) a partir de DNA + estado. `generateGardenModel` es el punto de entrada. |
| `GardenSvg.tsx` | `src/garden/GardenSvg.tsx` | Componente React principal. Renderiza el jardín completo como SVG animado con Framer Motion. Compone todas las capas: cielo, terreno, agua, elementos naturales, fauna, elementos sagrados, luces, árbol central y efectos transitorios. |
| `CommunityTree.tsx` | `src/garden/CommunityTree.tsx` | Renderiza un árbol comunitario colaborativo durante las oraciones en grupo. Cada miembro aporta un glyph único basado en su DNA. |

### 1.2 Sistema de Niveles (`src/garden/levels/`)

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `types.ts` | `src/garden/levels/types.ts` | Define `LevelConfig` con bonos por nivel (flores, luces, plantas, rocas, partículas, mariposas, rayos de luz). |
| `registry.ts` | `src/garden/levels/registry.ts` | Tabla estática de bonos por nivel (1–10). |
| `index.ts` | `src/garden/levels/index.ts` | `resolveLevel(level)` suma acumulativamente todos los bonos hasta el nivel dado. |
| `module.tsx` | `src/garden/levels/module.tsx` | `LevelModule`: renderiza elementos decorativos extra (flores, luces, etc.) otorgados por el nivel del usuario usando PRNG determinista. |

### 1.3 Estado Global y Emisión de Eventos (`src/fruits/`)

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `types.ts` | `src/fruits/types.ts` | Define `SpiritualEventType` (acciones del usuario), `SpiritualEvent`, `FruitBalance`, `Candle`, `FruitMeta`. Incluye los tipos de eventos que alimentan el jardín. |
| `rewards.ts` | `src/fruits/rewards.ts` | Tabla transparente de recompensas que mapea cada `SpiritualEventType` a frutas ganadas (vela, semilla, agua) y una nota. |
| `store.tsx` | `src/fruits/store.tsx` | Contexto React central `SpiritualProvider`. Conecta acciones del usuario → eventos de jardín → Supabase. Métodos clave: `emit(e)`, `lightCandle`, `prayForCandle`, `waterGarden`, `bulkWaterGarden`. Calcula `gardenState = aggregateGardenState(...)`. |

### 1.4 Pantallas Frontend

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `PerfilScreen.tsx` | `src/screens/PerfilScreen.tsx` | Pantalla de perfil con la pestaña "Mi Jardín". Renderiza `<GardenSvg>`, estadísticas, botones de riego, badge de DNA y modal de intenciones. Calcula `identity` (user ID o anónimo) y llama a `useGardenDna`. |
| `AdminPortal.tsx` | `src/screens/AdminPortal.tsx` | Panel administrativo con `GardenEditor` que permite insertar eventos de jardín arbitrarios para cualquier usuario (RPC `admin_insert_compensatory_event`). |

### 1.5 Arte Comunitario

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `types.ts` | `src/community/types.ts` | Define `SignatureShape`, `CommunitySignaturePayload`, `CommunityWorkSeed`, `CompositionKind` (manto, rosa-mística, rosario, paloma, etc.). |
| `composition.ts` | `src/community/composition.ts` | Genera geometría del arte comunitario a partir de firma de DNA. `signaturePayloadFromDna` deriva una firma comunitaria del DNA del jardín. |
| `CommunityWorkSvg.tsx` | `src/community/CommunityWorkSvg.tsx` | Renderiza el arte comunitario como SVG. Muestra una luz inicial, luego revela partículas según progreso (🙏 gestos). |
| `useCommunityWork.ts` | `src/community/useCommunityWork.ts` | Hook React para sesiones de oración comunitarias. Cada 🙏 añade una firma; las repeticiones aumentan `growthFactor`. Usa `useGardenDna`. |
| `gallery.ts` | `src/community/gallery.ts` | Carga y guarda obras comunitarias desde localStorage y Supabase (`community_works`). |
| `WorkCompleteOverlay.tsx` | `src/community/WorkCompleteOverlay.tsx` | Overlay a pantalla completa mostrando la obra comunitaria completada. |

### 1.6 Sesiones y Pantallas Relacionadas

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `LiveSession.tsx` | `src/screens/rosario/LiveSession.tsx` | Sesión en vivo de rosario. Renderiza `CommunityWorkSvg` como aura de fondo durante la sesión. |
| `GalleryScreen.tsx` | `src/screens/GalleryScreen.tsx` | Galería de todas las obras comunitarias completadas desde Supabase + localStorage. |

### 1.7 Identidad y Autenticación

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `anonId.ts` | `src/auth/anonId.ts` | Proporciona identidad anónima estable mediante `localStorage` + `crypto.randomUUID()`. Esta identidad es la semilla del DNA del jardín para usuarios no autenticados. |

### 1.8 Regla de Vida (Tareas)

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `useSpiritualTasks.ts` | `src/rule/useSpiritualTasks.ts` | Hook de gestión de tareas espirituales. Al marcar tareas como completadas, emite `task-complete` → `TASK_COMPLETED` (evento de jardín). |
| `tasks.ts` | `src/rule/tasks.ts` | Define `SpiritualTask` y plantillas de tareas diarias/semanales/mensuales por defecto. |

### 1.9 Base de Datos / Supabase (Migraciones SQL)

| Nombre de la Migración | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `20250101_water_garden.sql` | `supabase/migrations/` | Crea RPC `water_garden(p_intention)`: descuenta 1 agua de `fruits`, inserta evento `WATER_GARDEN`. |
| `20250101_bulk_water_garden.sql` | `supabase/migrations/` | Crea RPC `bulk_water_garden(p_user_id, p_intention)`: descuenta toda el agua, inserta evento `WATER_GARDEN` con valor bulk. |
| `20250101_record_spiritual_event.sql` | `supabase/migrations/` | Crea RPC `record_spiritual_event(...)`: emisor genérico de eventos en `garden_events`. |
| `20250101_admin_insert_compensatory_event.sql` | `supabase/migrations/` | Crea RPC `admin_insert_compensatory_event(...)`: inserción de eventos de jardín por parte de administradores. |
| `20250103_fix_garden_persistence.sql` | `supabase/migrations/` | Recrea `emit_spiritual_event(...)`: inserta en `garden_events` Y actualiza `fruits` y `fruit_history` atómicamente. Crea `commit_candle` (crea vela, descuenta, inserta `CANDLE_LIT`). Crea también `commit_gift_candle` (transfiere velas, inserta `PRAY_FOR_OTHER`). Crea tabla `garden_waterings` con RLS e índice. |
| `20250103_fix_water_garden_writings.sql` | `supabase/migrations/` | Recrea `water_garden` y `bulk_water_garden` con timestamps correctos y registros en `garden_waterings`. |
| `20260727_community_works.sql` | `supabase/migrations/` | Crea tabla `community_works` para las semillas de sesiones comunitarias. |

### 1.10 Worker / Notificaciones Push

| Nombre del Archivo | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `index.ts` | `worker/src/index.ts` | Worker de Cloudflare. A las 6 PM (hora local), revisa `garden_events` por usuario suscrito. Si no hay evento `WATER_GARDEN` ese día, envía push "Camino · 🌱 Jardín" con URL `/jardin`. |

### 1.11 Documentación y Planes

| Nombre del Documento | Ubicación | Función en la Generación del Jardín |
|---|---|---|
| `jardín.md` | `jardín.md` | Documentación en español del sistema SVG del jardín: DNA, estado, flujo de renderizado, PRNG, fórmulas de crecimiento, lógica de estanque/río, RPCs backend. |
| `prompt.md` | `prompt.md` | Documento general del proyecto con una sección de arquitectura del jardín (líneas 340–950). |
| `1784914409952-garden-svg-architecture.md` | `.kilo/plans/1784914409952-garden-svg-architecture.md` | Plan de arquitectura del jardín SVG: persistencia, decaimiento de salud, riego masivo y sistema de niveles. |

---

## 2. Flujo de Generación del Jardín

```
[Acciones del Usuario]
    │
    ▼
[src/fruits/store.tsx ── emit(e)]
    │
    ├─► [Supabase RPC: emit_spiritual_event, water_garden, bulk_water_garden, commit_candle]
    │       │
    │       ▼
    │   [garden_events (tabla)]
    │       │
    │       ▼
    │   [garden_waterings (tabla, solo riegos)]
    │
    ▼
[aggregateGardenState(gardenEvents, activeCandles)] → GardenState
    │
    ▼
[generateGardenModel(dna, state)] → GardenModel
    │
    ▼
[src/garden/GardenSvg.tsx] → SVG Renderizado
```

### 2.1 Paso 1: Identidad y DNA

- **Archivo:** `src/auth/anonId.ts`
- **Función:** Genera o recupera un UUID anónimo estable desde `localStorage`. Si el usuario está autenticado, se usa el `id` de Supabase.
- **Archivo:** `src/garden/dna.ts`
- **Función:** `computeDna(identity)` aplica SHA-256 al string de identidad. `deriveDnaTraits(dna)` segmenta el hash hex para obtener determinísticamente: `terrain`, `pathShape`, `treeSpecies`, `rockPattern`, `riverAngle`, `paletteVariant`, `flowerSpeciesBias`, `signatureSeed`.
- **Resultado:** `DnaTraits` — inmutable para siempre para esa identidad.

### 2.2 Paso 2: Registro de Eventos

- **Archivo:** `src/fruits/store.tsx`
- **Función:** Cada acción del usuario (orar rosario, encender vela, regar, etc.) llama a `emit(e)` que:
  1. Aplica recompensas locales frutas (vela, semilla, agua).
  2. Añade un `GardenEvent` al estado local.
  3. Persiste el evento en `garden_events` vía RPC Supabase.
- **Archivo:** `src/fruits/types.ts`
- **Función:** Define los tipos de `SpiritualEventType` que se traducen en eventos de jardín.

### 2.3 Paso 3: Agregación del Estado

- **Archivo:** `src/garden/events.ts`
- **Función:** `aggregateGardenState(events, activeCandles)` reduce la lista de `GardenEvent[]` en un único `GardenState`:
  - Cuenta rosarios, novenas, coronillas, riegos.
  - Calcula `waterLevel` (0–100), `lightLevel` (0–100), `health` (decaimiento desde última actividad, 48h).
  - Calcula `pointsScore`, `level` (raíz cuadrada), `maturityTier`, `growthPhase` (1 a 4).
  - Calcula `wateringEffectStrength`, `lifeRatio`, `dewPoints`, `butterflyCount`.
- **Resultado:** `GardenState` dinámico, refleja la actividad reciente.

### 2.4 Paso 4: Construcción del Modelo Procedural

- **Archivo:** `src/garden/model.ts`
- **Función:** `generateGardenModel(traits, state)` → `buildWildGarden(traits, state)`.
  - Genera **terreno**: 9 capas isométricas con verdes de hierba.
  - Genera **árbol central**: cedro (si `treeSpecies` lo indica) o árbol genérico. El tamaño depende de la historia devocional (rosarios, novenas).
  - Genera **estanque** isométrico con koi, lirios, loto y ondulaciones. La visibilidad depende de `waterLevel`.
  - Genera **clusters de flora**: rosas, lirios, coronillas, lavanda, romero, tomillo, arbustos de olivo. Las cantidades dependen de rosarios, novenas, coronillas, semillas.
  - Genera **rocas**, **plantas ambientales**, **flores ambientales**, **luces**, **mariposas**, **partículas**, **rayos de luz**.
  - Genera **paloma** (si `streak ≥ 7` o comunidad ≥ 5).
  - Genera **ciervo** (si `waterLevel > 40`).
  - Genera **nodos sagrados** (cruces/altares en fases de crecimiento 2–3).
  - Genera **arco de gruta** y **geometría sagrada** (solo en fase de crecimiento 3).
- **Archivo:** `src/garden/prng.ts`
- **Función:** Todos los parámetros geométricos (posiciones, tamaños, rotaciones) se generan con PRNG determinista `createPrng(seed)` o `noise1D(x, seed)` usando semillas derivadas del DNA. **Nunca** usa `Math.random()`.
- **Archivo:** `src/garden/levels/module.tsx`
- **Función:** `LevelModule` añade elementos decorativos extra según el nivel acumulado (flores, luces, plantas, rocas, partículas, mariposas, rayos). `resolveLevel(level)` suma bonos usando la `registry.ts`.
- **Resultado:** `GardenModel` completo con coordenadas, geometrías, colores, animaciones y metadatos de cada elemento.

### 2.5 Paso 5: Renderizado SVG

- **Archivo:** `src/garden/GardenSvg.tsx`
- **Función:** `GardenSvg` recibe `dna`, `state`, `showRain`, `justWatered`.
  1. Llama a `generateGardenModel(dna, state)` y `signatureFromDna(dna)`.
  2. Aplica filtros visuales según la salud: `saturate` (baja saturación = decaimiento), `contentOpacity`, overlay de sequía.
  3. Compone capas en orden z-index:
     - `SkyLayer` (cielo con gradiente estacional + nubes).
     - `TerrainLayerComponent` (terreno isométrico).
     - `Shadows` (sombras proyectadas).
     - `WaterLayer` (estanque o río dependiendo de `waterLevel` y `riverAngle`).
     - `NaturalElements` (plantas, flores, clusters, árbol central).
     - `FaunaLayer` (ciervo, paloma, mariposas, partículas, luciérnagas).
     - `SacredElements` (nodos sagrados, arco de gruta, geometría sagrada).
     - `LightsLayer` (luces dinámicas según eventos).
     - `CentralTree` (árbol cedro o genérico animado).
     - `TransientEffects` (rayos de luz, animación de lluvia, pulso de riego, overlay de sequía, puntos de rocío).
     - `SignatureBlock` (placa de piedra con glyph único del DNA).
  4. Usa `framer-motion` para animaciones de entrada escalonadas según `growthPhase` y estado.
- **Resultado:** SVG completo, animado, interactivo.

---

## 3. Acciones del Usuario que Contribuyen al Jardín

### 3.1 Mapeo de Acciones a Eventos de Jardín

| Acción del Usuario | Archivo Origen | SpiritualEventType | GardenEventType | Efecto en el Jardín |
|---|---|---|---|---|
| Completar rosario diario | `src/screens/RosarioScreen.tsx:46` | `rosary-complete` | `ROSARY_COMPLETED` | Hace crecer el árbol, añade rosas, genera semillas. |
| Mantener racha diaria | `src/screens/RosarioScreen.tsx:47` | `daily-streak` | `STREAK_MAINTAINED` | Fortalece el árbol, posiblemente añade paloma. |
| Unirse a oración comunitaria | `src/screens/RosarioScreen.tsx:56` | `community-join` | `COMMUNITY_PRAYER` | Aumenta `lightLevel`, contribuye a la aparición de la paloma. |
| Completar tarea (Regla de Vida) | `src/screens/ReglaScreen.tsx:30` | `task-complete` | `TASK_COMPLETED` | Crecimiento menor, puntos de experiencia. |
| Completar lectura/portal/jornada | `src/App.tsx:107,113,119` | `task-complete` | `TASK_COMPLETED` | Igual que tarea completada. |
| Orar por la vela de otro | `src/fruits/store.tsx:275` | `pray-for-other` | `WATER_GARDEN` | Riega el jardín indirectamente, sube `waterLevel`. |
| Encender vela (por intención) | `src/fruits/store.tsx:230-233` | vía RPC `commit_candle` | `CANDLE_LIT` | Agua el jardín, sube `lightLevel`. |
| Regar el jardín (1💧) | `src/fruits/store.tsx:303-311` | vía RPC `water_garden` | `WATER_GARDEN` | Riega directamente, sube `waterLevel`, muestra animación de lluvia. |
| Regar todo el jardín | `src/fruits/store.tsx:344-353` | vía RPC `bulk_water_garden` | `WATER_GARDEN` | Riega con toda el agua disponible, sube `waterLevel` significativamente. |
| Leer intención | `src/fruits/types.ts` | `read-intention` | `SILENCE_TIME` | Añade semillas y vegetación. |
| Finalizar reflexión | `src/fruits/types.ts` | `reflection-finish` | `SILENCE_TIME` | Añade semillas y vegetación. |

### 3.2 Cómo Afectan las Cantidades

- **Rosarios completados** → Aumentan tamaño del árbol central y cantidad de rosas.
- **Novenas / Coronillas** → Añaden wreaths (coronas de flores) y flores específicas.
- **Riegos (WATER_GARDEN)** → Aumentan `waterLevel`, haciendo visible/animar el estanque (koi, lirios, loto), añaden flora y pueden revelar el ciervo.
- **Velas encendidas (CANDLE_LIT)** → Aumentan `lightLevel`, añaden luces centelleantes.
- **Racha diaria ≥ 7** → Revelan la paloma celestial.
- **Comunidad ≥ 5 oraciones** → Revelan la paloma.
- **`waterLevel > 40`** → Revelan el ciervo en el bosque.
- **`growthPhase` (1–4)** → Determina fases de crecimiento:
  - Fase 1: Terreno básico, árbol pequeño.
  - Fase 2–3: Nodos sagrados (cruces/altares).
  - Fase 4: Arco de gruta + geometría sagrada completa.

---

## 4. Factores que Influyen en el Jardín

### 4.1 Identidad (DNA)

- **Terreno** (`terrain`): Tipo de terreno base (prado, bosque, colina, desierto, etc.).
- **Forma del sendero** (`pathShape`): Geometría del camino.
- **Especie de árbol** (`treeSpecies`): Cedro, roble, olivo, etc.
- **Patrón de rocas** (`rockPattern`): Disposición de rocas decorativas.
- **Ángulo del río** (`riverAngle`): Si el agua es baja, se muestra un río.
- **Variante de paleta** (`paletteVariant`): Matiz de color base.
- **Sesgo de especie floral** (`flowerSpeciesBias`): Predominio de ciertas flores.
- **Semilla de firma** (`signatureSeed`): Glyph único en la placa de piedra.

### 4.2 Estado Dinámico

- **`totalRosaries`**, **`totalNovenas`**, **`totalCoronillas`** → Cantidad de flora.
- **`waterLevel`** (0–100) → Visibilidad y animación del estanque/koi/lirios. Si es muy bajo, overlay de sequía.
- **`lightLevel`** (0–100) → Cantidad de luces centelleantes.
- **`health`** (0–100) → Saturación del SVG. Si decae por inactividad (48h), el jardín se muestra grisáceo.
- **`level`** (raíz cuadrada de puntos) → Nivel 1–10. Bonos acumulativos de flora, luces, partículas.
- **`growthPhase`** (1–4) → Revela progresivamente elementos sagrados y estructuras.
- **`maturityTier`** (semilla, brote, árbol, bosque) → Etiqueta textual del progreso.
- **`streak`** → Paloma si ≥ 7.
- **`commits`** (oraciones comunitarias) → Paloma si ≥ 5.
- **`dewPoints`** → Efecto visual de rocío.

---

## 5. Reglas Visuales y Determinismo

- **Determinismo total:** Dado el mismo `DnaTraits` y `GardenState`, el SVG es idéntico. No hay aleatoriedad en runtime.
- **Salud y decaimiento:** Si el usuario no interactúa en 48h, `health` decrece gradualmente, reduciendo saturación y opacidad. Al regar o interactuar, se recupera.
- **Efecto de riego:** Al regar (1💧 o bulk), se activa `justWatered` y `showRain` durante unos segundos: animación de lluvia + pulso de agua + destellos.
- **Overlay de sequía:** Si `waterLevel` es muy bajo, se muestra un overlay marrón translúcido sobre el jardín.
- **Estacionalidad:** La paleta y algunos elementos se ajustan según `GardenSeason` (advent, christmas, lent, easter, pentecost, ordinary).

---

## 6. Flujo de Datos Completo (Arquitectura)

```
[Cliente]
    │
    ├─► [Acciones del Usuario] (ver §3)
    │       │
    │       ▼
    │   [src/fruits/store.tsx: emit() / waterGarden() / lightCandle()...]
    │       │
    │       ├─► Estado Local: gardenEvents[], fruits, candles
    │       │
    │       ▼
    │   [aggregateGardenState()] → GardenState
    │       │
    │       ▼
    │   [generateGardenModel(dna, state)] → GardenModel
    │       │
    │       ▼
    │   [GardenSvg] → <svg> con Framer Motion
    │
    └───────────┐
                │ HTTP/RPC
                ▼
    [Supabase Backend]
        │
        ├─► Tabla: garden_events (append-only)
        │       - id, user_id, type, value, created_at, meta
        │       - RLS: cada usuario solo ve sus eventos
        │
        ├─► Tabla: garden_waterings (historial de riegos)
        │       - id, user_id, amount, intention, watered_at
        │
        ├─► Tabla: fruits (balances: vela, semilla, agua)
        │
        └─► RPCs:
                - emit_spiritual_event(...) (persiste evento + actualiza frutas)
                - water_garden(p_intention) (riego unitario)
                - bulk_water_garden(p_user_id, p_intention) (riego masivo)
                - commit_candle(...) (encender vela)
                - commit_gift_candle(...) (regalar vela)
                - admin_insert_compensatory_event(...) (solo admin)
```

---

## 7. Referencias Adicionales

- **Jardin anónimo:** Si el usuario no está autenticado, `anonId.ts` genera un UUID que se guarda en `localStorage`. Ese UUID es la base del DNA, por tanto el jardín persiste entre sesiones aunque no haya cuenta.
- **Sincronización en tiempo real:** `src/fruits/store.tsx` usa suscripciones Realtime de Supabase para `fruits`, `candles`, `garden_events` y `intentions`. Cualquier cambio desde otro dispositivo refleja inmediatamente en el jardín.
- **Componentes desacoplados:** El núcleo (`model.ts`, `dna.ts`, `prng.ts`, `events.ts`) no tiene dependencias de React. Solo `GardenSvg.tsx`, `store.tsx` y pantallas usan React/ hooks.
- **Community Tree:** Durante sesiones comunitarias, cada 🙏 añade una firma derivada del DNA del usuario. `CommunityTree.tsx` y `CommunityWorkSvg.tsx` renderizan el árbol colaborativo. El obra se guarda en `community_works` y localStorage.

---

*Documento generado el 2026-07-27*
