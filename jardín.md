# Análisis del Jardín SVG — Camino

## 1. Resumen general

El jardín de `Camino` es un SVG isométrico generado 100 % en el frontend. No existen assets estáticos: todo se renderiza de forma determinista a partir de:

- **DNA permanente** del usuario (rasgos estéticos, inmutables).
- **Estado agregado** (`GardenState`) calculado desde eventos espirituales persistidos en Supabase (`garden_events`).

No se transpila desde un servidor; el backend solo aporta **eventos append-only** y **recursos** (`fruits`: agua, semilla, vela).

---

## 2. Variables que se toman en cuenta

### 2.1. DNA permanente (`DnaTraits`)

Derivado del hash `SHA-256(identity)` donde `identity = user.id ?? anonId local`.  
Se segmenta el hex en índices sobre arrays fijos.

| Campo | Significado visual |
|---|---|
| `dna` | Seed principal del PRNG |
| `terrain` | Tipo de terreno: `llano`, `colina`, `ribera`, `valle`, `cueva` |
| `pathShape` | Forma de los caminos: `sinuoso`, `lineal`, `circular` |
| `treeSpecies` | Árbol central: `cedro`, `olivo`, `palmera`, `sauce` |
| `rockPattern` | Patrón de rocas: `disperso`, `alineado`, `círculo` |
| `riverAngle` | Ángulo del río/estanque |
| `paletteVariant` | Variante cromática general |
| `flowerSpeciesBias` | Sesgo de especie floral predominante |
| `signatureSeed` | Seed para el glifo de la placa |

### 2.2. Estado del jardín (`GardenState`)

Agregado en el front a partir de `garden_events` por usuario.

| Campo | Cálculo / origen |
|---|---|
| `totalRosaries` | `event.type === ROSARY_COMPLETED` |
| `totalNovenas` | `event.type === NOVENA_COMPLETED` |
| `totalCoronillas` | `event.type === CORONILLA_COMPLETED` |
| `totalWaterings` | `event.type === WATER_GARDEN` |
| `totalSeeds` | `SEED_RECEIVED + rosaries + floor(silence / 10)` |
| `totalSilenceMinutes` | `SILENCE_MINUTES` acumulado |
| `activeCandles` | Conteo de velas encendidas activas |
| `streak` | `STREAK_MAINTAINED + floor(rosaries / 2)` |
| `communityPrayer` | Eventos comunitarios |
| `waterLevel` | `min(100, waterings * 8 + WATER_RECEIVED * 4)` |
| `lightLevel` | `min(100, 22 + communityPrayer * 12 + CANDLE_LIT * 2)` |
| `birdCount` | Derivado de `lightLevel` |
| `butterflyCount` | `min(6, floor(waterLevel / 18))` |
| `season` | Mes actual del año |
| `lastGrowth` | `timestamp` del último evento |
| `health` | `clamp(1 - elapsedHours / 48, 0, 1)` — decae desde la última actividad |
| `pointsScore` | `rosaries*10 + novenas*30 + coronillas*15 + waterings*2 + floor(silence/10) + community*5 + streak*3` |
| `level` | `floor(sqrt(pointsScore / 15))` |

Bonos extra por nivel (`LevelConfig`):

| Campo | Efecto visual |
|---|---|
| `flowerBonus` | Flores adicionales decorativas |
| `lightBonus` | Iluminación ambiente extra |
| `plantBonus` | Vegetación adicional |
| `rockBonus` | Rocas ornamentales |
| `particleBonus` | Partículas brillantes |
| `butterflyBonus` | Mariposas adicionales |
| `lightRayBonus` | Rayos de luz postizos |

### 2.3. Variables de interacción

| Variable | Origen | Efecto en el SVG |
|---|---|---|
| `showRain` | Estado local en `PerfilScreen` | Activa animación de lluvia tras regar |
| `justWatered` | Estado local en `PerfilScreen` | Resalta el jardín brevemente tras regar |
| `intention` | Input del usuario al regar | Se guarda en `garden_events.intention` y se muestra en el historial |

---

## 3. Cómo se genera el SVG

### 3.1. Flujo de render

1. `PerfilScreen` obtiene `identity = user.id ?? getAnonIdentity()`.
2. `useGardenDna(identity)` calcula `DnaTraits` deterministamente.
3. `useSpiritual()` carga `garden_events` de Supabase y calcula `gardenState` vía `aggregateGardenState`.
4. `<GardenSvg dna={traits} state={gardenState} showRain={rain} justWatered={watered}>` recibe las props.
5. Dentro de `GardenSvg`:
   - `model = generateGardenModel(dna, state)` genera toda la geometría.
   - `signature = signatureFromDna(dna)` genera el glifo de la placa.
   - Se aplican filtros visuales según `health`:
     - `saturate = 0.45 + 0.55 * health`
     - `contentOpacity = 0.65 + 0.35 * health`
     - Si `health < 0.3`: overlay sepia sequía.
   - `<LevelModule config={resolveLevel(state.level)} dna={dna} />` renderiza bonos por nivel.
6. El SVG final se compone de capas isométricas: terreno → suelo → río/estanque → rocas → árbol central → flora base → flora devocional → luces → mariposas → partículas → rayos de luz → placa.

### 3.2. Prng determinista

Todo el dibujo usa Mulberry32 con seeds del tipo `"${dna.dna}:elemento"`.  
Garantiza que el mismo usuario vea siempre el mismo jardín sin importar el dispositivo.

### 3.3. Crecimiento del árbol central

- `historyTotal = rosaries*1.2 + novenas*3 + coronillas*1.5 + streak*0.6 + waterings*0.2`
- `trunkHeight = 60 + min(50, historyTotal * 0.4)`
- `canopyScale = 1 + min(0.6, historyTotal / 100)`

### 3.4. Vegetación devocional (presupuesto)

| Elemento | Condición |
|---|---|
| Rosas | `Math.floor(state.totalRosaries / 2)` |
| Coronillas | `Math.floor(state.totalCoronillas / 3)` |
| Lirios | `Math.floor(state.totalNovenas / 2)` |
| Olivos | Bonificados por nivel y season |

### 3.4. Estanque vs río

- Visible si `state.waterLevel > 10 || model.pond?.visible`
- Se alterna entre `pond` y `river` según el ángulo configurado en `dna.riverAngle`.

---

## 4. Cómo accede el usuario a estas variables en el frontend

### 4.1. Pantalla principal

**Archivo:** `src/screens/PerfilScreen.tsx`

```
Tab "Mi Jardín":
├── <GardenSvg dna={traits} state={gardenState} showRain={rain} justWatered={watered} />
├── StatCard: Rosarios → gardenState.totalRosaries
├── StatCard: Coronillas → gardenState.totalCoronillas
├── StatCard: Novenas → gardenState.totalNovenas
├── 💧 Regar mi jardín → agua={balance.agua}
│     ├── waterGarden(intention)
│     └── bulkWaterGarden(intention)
├── milestone: gardenState.totalRosaries / totalNovenas / totalCoronillas / streak
└── Historial de intenciones → gardenEvents + garden_waterings
```

### 4.2. Store global

**Archivo:** `src/fruits/store.tsx`

Contexto `SpiritualProvider` expone:

```ts
{
  gardenEvents: GardenEvent[];
  gardenState: GardenState;
  balance: { vela: number; semilla: number; agua: number };
  activeIntentions: Intention[];
  waterGarden(intention: string): void;
  bulkWaterGarden(intention: string): void;
  emit(event): void;
}
```

**Origen de datos (Supabase realtime):**
- `fruits` → `SELECT vela, semilla, agua`
- `candles` → velas activas
- `garden_events` → eventos ordenados por `created_at`
- `intentions` → `pray_for_id = user.id`
- Realtime en `fruits`, `garden_events`, `candles`

### 4.3. Backend / Supabase

**Tablas relevantes:**
- `garden_events` — append-only: `id`, `user_id`, `event_type`, `value`, `intention`, `created_at`
- `garden_waterings` — historial de riegos: `id`, `user_id`, `amount`, `intention`, `watered_at`
- `fruits` — recursos: `profile_id`, `vela`, `semilla`, `agua`
- `fruit_history` — histórico de cambios en recursos

**RPC usadas:**
- `water_garden(p_intention)` — consume 1 unidad de agua, inserta evento + historial.
- `bulk_water_garden(p_user_id, p_intention)` — consume todo el agua disponible.
- `emit_spiritual_event(...)` — inserta eventos genéricos y ajusta frutas.
- `commit_candle(...)` — enciende vela y descuenta fruta.
- `commit_gift_candle(...)` — transfiere velas entre usuarios.

### 4.4. Panel admin

**Archivo:** `src/screens/AdminPortal.tsx`

Permite inspeccionar el estado del jardín y forzar eventos de compensación.

---

## 5. Resumen visual de variables

```
Usuario accede a "Mi Jardín"
    │
    ├── DNA (inmutable)
    │     └── [terrain, pathShape, treeSpecies, rockPattern, riverAngle,
    │          paletteVariant, flowerSpeciesBias, signatureSeed]
    │
    ├── Estado agregado (dinámico)
    │     └── [waterLevel, lightLevel, health, pointsScore, level,
    │          totalRosaries, totalNovenas, totalCoronillas,
    │          totalWaterings, totalSeeds, totalSilenceMinutes,
    │          activeCandles, streak, communityPrayer,
    │          birdCount, butterflyCount, season, lastGrowth]
    │
    └── Interacción puntual
          └── [showRain, justWatered, intention]
```
