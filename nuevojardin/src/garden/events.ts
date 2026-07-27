/* ============================================================================
 * src/garden/events.ts — Mapeo de eventos espirituales y agregación de estado
 * ==========================================================================*/
import { clamp } from "./prng";
import { computeTimeOfDay } from "./time";
import type {
  GardenEvent, GardenEventType, GardenState,
  GrowthPhase, MaturityTier, GardenSeason, Milestone,
} from "./types";

/* ── Mapeo SpiritualEventType → GardenEventType ─────────────────────────── */
const EVENT_MAP: Record<string, GardenEventType> = {
  "rosary-complete": "ROSARY_COMPLETED",
  "novena-complete": "NOVENA_COMPLETED",
  "coronilla-complete": "CORONILLA_COMPLETED",
  "task-complete": "TASK_COMPLETED",
  "daily-streak": "STREAK_MAINTAINED",
  "community-join": "COMMUNITY_PRAYER",
  "candle-lit": "CANDLE_LIT",
  "pray-for-other": "PRAY_FOR_OTHER",
  "water-garden": "WATER_GARDEN",
  "read-intention": "SILENCE_TIME",
  "reflection-finish": "SILENCE_TIME",
  "reflection-complete": "REFLECTION_COMPLETED",
  "seed-received": "SEED_RECEIVED",
  "water-received": "WATER_RECEIVED",
};

export function gardenEventType(spiritualEventType: string): GardenEventType | null {
  return EVENT_MAP[spiritualEventType] ?? null;
}

/* ── Pesos: puntos, agua y luz por tipo de evento ───────────────────────── */
const WEIGHTS: Record<GardenEventType, { pts: number; water: number; light: number }> = {
  ROSARY_COMPLETED:     { pts: 10, water: 4,  light: 6  },
  NOVENA_COMPLETED:     { pts: 14, water: 5,  light: 8  },
  CORONILLA_COMPLETED:  { pts: 8,  water: 3,  light: 5  },
  SILENCE_TIME:         { pts: 4,  water: 2,  light: 3  },
  WATER_GARDEN:         { pts: 3,  water: 22, light: 2  },
  COMMUNITY_PRAYER:     { pts: 9,  water: 3,  light: 10 },
  STREAK_MAINTAINED:    { pts: 6,  water: 3,  light: 4  },
  TASK_COMPLETED:       { pts: 3,  water: 1,  light: 2  },
  SEED_RECEIVED:        { pts: 2,  water: 1,  light: 1  },
  WATER_RECEIVED:       { pts: 2,  water: 6,  light: 1  },
  CANDLE_LIT:           { pts: 5,  water: 2,  light: 9  },
  PRAY_FOR_OTHER:       { pts: 7,  water: 8,  light: 7  },
  REFLECTION_COMPLETED: { pts: 4,  water: 2,  light: 3  },
};

const DAY = 86_400_000;
const DECAY_GRACE_MS = 48 * 3_600_000; // 48 h sin actividad → empieza el decaimiento

/* ── Temporada litúrgica aproximada ─────────────────────────────────────── */
export function currentSeason(d = new Date()): GardenSeason {
  const m = d.getMonth() + 1, day = d.getDate();
  if (m === 12 && day <= 24) return "advent";
  if ((m === 12 && day >= 25) || (m === 1 && day <= 12)) return "christmas";
  if (m === 2 || (m === 3 && day <= 25)) return "lent";
  if ((m === 3 && day > 25) || m === 4) return "easter";
  if (m === 5 || (m === 6 && day <= 10)) return "pentecost";
  return "ordinary";
}

/* ── Racha diaria a partir de días con actividad ────────────────────────── */
function computeStreak(events: GardenEvent[]): number {
  const days = new Set(
    events.map((e) => Math.floor(new Date(e.created_at).getTime() / DAY)),
  );
  let streak = 0;
  let cursor = Math.floor(Date.now() / DAY);
  if (!days.has(cursor)) cursor -= 1; // permite que "hoy" aún no tenga actividad
  while (days.has(cursor)) { streak++; cursor--; }
  return streak;
}

/* ── Nivel: raíz cuadrada de puntos, tope 10 ────────────────────────────── */
function levelFromPoints(points: number): number {
  return clamp(Math.floor(Math.sqrt(points / 10)) + 1, 1, 10);
}

function maturityFromPoints(points: number): MaturityTier {
  if (points < 25) return "seed";
  if (points < 90) return "sprout";
  if (points < 260) return "tree";
  return "forest";
}

function phaseFromPoints(points: number): GrowthPhase {
  if (points < 25) return 1;
  if (points < 90) return 2;
  if (points < 260) return 3;
  return 4;
}

/* ── Hitos ──────────────────────────────────────────────────────────────── */
const MILESTONE_RULES: Array<{ type: GardenEventType; n: number; label: string; detail: string }> = [
  { type: "ROSARY_COMPLETED",    n: 1,  label: "Tu primer Rosario",              detail: "La raíz comenzó a hundirse en la tierra." },
  { type: "ROSARY_COMPLETED",    n: 5,  label: "Cinco Rosarios ofrecidos",       detail: "Brotaron las primeras rosas." },
  { type: "ROSARY_COMPLETED",    n: 10, label: "Un rosal creció con tus Rosarios", detail: "Diez decenas, diez pétalos abiertos." },
  { type: "ROSARY_COMPLETED",    n: 33, label: "Treinta y tres Rosarios",        detail: "Los años de Cristo, cumplidos en oración." },
  { type: "CORONILLA_COMPLETED", n: 5,  label: "La Misericordia floreció",       detail: "Cinco coronillas, un manantial." },
  { type: "NOVENA_COMPLETED",    n: 1,  label: "Tu primera Novena",              detail: "Nueve días de constancia." },
  { type: "NOVENA_COMPLETED",    n: 9,  label: "Nueve Novenas completadas",      detail: "El arco de la gruta se alzó." },
  { type: "CANDLE_LIT",          n: 1,  label: "Encendiste tu primera vela",     detail: "La luz llegó al jardín." },
  { type: "CANDLE_LIT",          n: 12, label: "Doce velas encendidas",          detail: "Doce estrellas coronan tu jardín." },
  { type: "WATER_GARDEN",        n: 1,  label: "Regaste tu jardín",              detail: "El agua despertó la tierra." },
  { type: "WATER_GARDEN",        n: 30, label: "Treinta riegos fieles",          detail: "El estanque nunca se secó." },
  { type: "COMMUNITY_PRAYER",    n: 5,  label: "La paloma descendió",            detail: "Cinco oraciones en comunidad." },
  { type: "PRAY_FOR_OTHER",      n: 3,  label: "Oraste por otros",               detail: "Tu agua regó jardines ajenos." },
];

/* ── Agregación principal ───────────────────────────────────────────────── */
export function aggregateGardenState(
  events: GardenEvent[],
  activeCandles = 0,
): GardenState {
  const now = Date.now();
  const sorted = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const counts = {} as Record<GardenEventType, number>;
  let pointsScore = 0;
  let rawWater = 0;
  let rawLight = 0;
  let lastActivityAt: number | null = null;
  let lastWaterAt: number | null = null;
  let lastWaterValue = 1;
  const milestones: Milestone[] = [];

  for (const e of sorted) {
    const w = WEIGHTS[e.type];
    if (!w) continue;
    const value = Math.max(1, e.value ?? 1);
    const ts = new Date(e.created_at).getTime();
    const ageDays = Math.max(0, (now - ts) / DAY);

    counts[e.type] = (counts[e.type] ?? 0) + 1;
    pointsScore += w.pts * value;
    lastActivityAt = Math.max(lastActivityAt ?? 0, ts);

    // Agua y luz decaen exponencialmente con la edad del evento
    rawWater += w.water * value * Math.exp(-ageDays / 5);
    rawLight += w.light * value * Math.exp(-ageDays / 7);

    if (e.type === "WATER_GARDEN" || e.type === "PRAY_FOR_OTHER") {
      lastWaterAt = ts;
      lastWaterValue = value;
    }

    // Hitos
    for (const r of MILESTONE_RULES) {
      if (r.type === e.type && counts[e.type] === r.n) {
        milestones.push({ id: `${r.type}-${r.n}`, label: r.label, detail: r.detail, at: ts });
      }
    }
  }

  // Velas activas mantienen la luz encendida
  rawLight += activeCandles * 8;

  const waterLevel = clamp(Math.round(rawWater), 0, 100);
  const lightLevel = clamp(Math.round(rawLight), 0, 100);

  // Salud: 100 mientras haya actividad en 48 h; luego decae ~12 pts/día
  let health = 100;
  if (lastActivityAt === null) {
    health = 45;
  } else {
    const idleMs = now - lastActivityAt;
    if (idleMs > DECAY_GRACE_MS) {
      const idleDays = (idleMs - DECAY_GRACE_MS) / DAY;
      health = clamp(100 - idleDays * 12, 18, 100);
    }
  }
  // El agua sostiene la salud
  health = clamp(health * (0.6 + 0.4 * (waterLevel / 100)) + waterLevel * 0.12, 12, 100);

  // Fuerza del riego reciente (decae en ~90 s de reloj real → efecto visual)
  let wateringEffectStrength = 0;
  if (lastWaterAt) {
    const since = (now - lastWaterAt) / 1000;
    wateringEffectStrength = clamp(1 - since / 90, 0, 1) * clamp(lastWaterValue / 3, 0.4, 1);
  }

  const level = levelFromPoints(pointsScore);
  const maturityTier = maturityFromPoints(pointsScore);
  const growthPhase = phaseFromPoints(pointsScore);
  const lifeRatio = clamp((health / 100) * 0.55 + (waterLevel / 100) * 0.25 + (lightLevel / 100) * 0.2, 0, 1);

  /* ── Vitalidad efímera: riego dentro de las últimas 24 h ── */
  const sinceWater = lastWaterAt ? now - lastWaterAt : Infinity;
  const freshWater = sinceWater < DAY;
  const freshWaterRatio = freshWater ? clamp(1 - sinceWater / DAY, 0, 1) : 0;

  /* Rocío: activo sobre todo tras regar (minimalista, máx. 7 puntos) */
  const dewPoints = Math.round(
    clamp((waterLevel / 100) * 4 + freshWaterRatio * 5, 0, 7),
  );

  /* Fauna: topes bajos para no saturar el lienzo */
  const butterflyCount = Math.round(clamp((waterLevel / 100) * 3 + lifeRatio, 0, 3));
  const birdCount = Math.round(clamp((lightLevel / 100) * 2 + (level >= 5 ? 1 : 0), 0, 2));

  /* Velas físicamente encendidas (parámetro + eventos recientes de 24 h) */
  const recentCandles = sorted.filter(
    (e) => e.type === "CANDLE_LIT" && now - new Date(e.created_at).getTime() < DAY,
  ).length;
  const totalActiveCandles = clamp(Math.max(activeCandles, recentCandles), 0, 5);

  milestones.sort((a, b) => b.at - a.at);

  return {
    waterLevel,
    lightLevel,
    health: Math.round(health),
    pointsScore: Math.round(pointsScore),
    level,
    maturityTier,
    growthPhase,
    wateringEffectStrength,
    lifeRatio,
    dewPoints,
    butterflyCount,
    birdCount,
    activeCandles: totalActiveCandles,
    totalRosaries: counts.ROSARY_COMPLETED ?? 0,
    totalNovenas: counts.NOVENA_COMPLETED ?? 0,
    totalCoronillas: counts.CORONILLA_COMPLETED ?? 0,
    totalWaterings: counts.WATER_GARDEN ?? 0,
    totalCandles: counts.CANDLE_LIT ?? 0,
    totalSilence: counts.SILENCE_TIME ?? 0,
    streak: computeStreak(sorted),
    commits: counts.COMMUNITY_PRAYER ?? 0,
    season: currentSeason(),
    timeOfDay: computeTimeOfDay(),
    lastActivityAt,
    freshWater,
    freshWaterRatio,
    lastWateredAt: lastWaterAt,
    milestones: milestones.slice(0, 8),
  };
}

/** Estado neutro para renderizar antes de cargar datos. */
export function emptyGardenState(): GardenState {
  return aggregateGardenState([], 0);
}
