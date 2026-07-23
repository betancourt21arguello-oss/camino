import type { SpiritualEventType } from "../fruits/types";
import type { GardenEvent, GardenEventType, GardenState } from "./types";

const EVENT_MAP: Record<SpiritualEventType, GardenEventType> = {
  "rosary-complete": "ROSARY_COMPLETED",
  "coronilla-complete": "CORONILLA_COMPLETED",
  "novena-complete": "NOVENA_COMPLETED",
  "community-join": "COMMUNITY_PRAYER",
  "pray-for-other": "WATER_GARDEN",
  "read-intention": "SILENCE_TIME",
  "reflection-finish": "SILENCE_TIME",
  "daily-streak": "STREAK_MAINTAINED",
  "task-complete": "TASK_COMPLETED",
};

export function gardenEventType(type: SpiritualEventType): GardenEventType {
  return EVENT_MAP[type];
}

export const INITIAL_GARDEN_EVENTS: GardenEvent[] = [
  { id: "g1", type: "SEED_RECEIVED", value: 8, createdAt: 1 },
  { id: "g2", type: "WATER_GARDEN", value: 2, createdAt: 2, meta: { intention: "Familia" } },
  { id: "g3", type: "ROSARY_COMPLETED", value: 3, createdAt: 3 },
  { id: "g4", type: "COMMUNITY_PRAYER", value: 2, createdAt: 4 },
  { id: "g5", type: "STREAK_MAINTAINED", value: 12, createdAt: 5 },
  { id: "g6", type: "NOVENA_COMPLETED", value: 1, createdAt: 6 },
  { id: "g7", type: "SILENCE_TIME", value: 15, createdAt: 7 },
];

export function aggregateGardenState(
  events: GardenEvent[],
  activeCandles: number,
): GardenState {
  const count = (type: GardenEventType) =>
    events
      .filter((event) => event.type === type)
      .reduce((sum, event) => sum + event.value, 0);

  const rosaries = count("ROSARY_COMPLETED");
  const novenas = count("NOVENA_COMPLETED");
  const coronillas = count("CORONILLA_COMPLETED");
  const waterings = count("WATER_GARDEN") + count("WATER_RECEIVED") + count("CANDLE_LIT");
  const silence = count("SILENCE_TIME") + count("REFLECTION_COMPLETED");
  const community = count("COMMUNITY_PRAYER");
  // Las semillas ahora son pasivas: nutren la vegetación base del jardín.
  const seeds = count("SEED_RECEIVED") + rosaries + Math.floor(silence / 10);
  const streak = count("STREAK_MAINTAINED") + Math.floor(rosaries / 2);

  const waterLevel = Math.min(100, waterings * 8 + count("WATER_RECEIVED") * 4);
  const lightLevel = Math.min(100, 22 + community * 12 + count("CANDLE_LIT") * 2);
  const butterflyCount = Math.min(6, Math.floor(waterLevel / 18));

  return {
    totalRosaries: rosaries,
    totalNovenas: novenas,
    totalCoronillas: coronillas,
    totalWaterings: waterings,
    totalSeeds: seeds,
    totalSilenceMinutes: silence,
    activeCandles,
    streak,
    communityPrayer: community,
    rosaries,
    novenas,
    coronillas,
    waterLevel,
    lightLevel,
    birdCount: 0,
    butterflyCount,
    season: "ordinary",
    lastGrowth: events.at(-1)?.createdAt ?? 0,
  };
}
