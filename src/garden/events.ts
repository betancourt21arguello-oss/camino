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

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

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
  const seeds = count("SEED_RECEIVED") + rosaries + Math.floor(silence / 10);
  const streak = count("STREAK_MAINTAINED") + Math.floor(rosaries / 2);

  const waterLevel = Math.min(100, waterings * 8 + count("WATER_RECEIVED") * 4);
  const lightLevel = Math.min(100, 22 + community * 12 + count("CANDLE_LIT") * 2);
  const butterflyCount = Math.min(6, Math.floor(waterLevel / 18));

  const lastActivityTime = events.at(-1)?.createdAt ?? 0;
  const lastWateredAt = events
    .filter((e) => e.type === "WATER_GARDEN")
    .sort((a, b) => b.createdAt - a.createdAt)[0]?.createdAt;

  const twentyFourHours = 24 * 60 * 60 * 1000;
  const recentWatering = !!lastWateredAt && Date.now() - lastWateredAt < twentyFourHours;
  const healthReferenceTime = recentWatering ? lastWateredAt : lastActivityTime;
  const elapsedHours = (Date.now() - healthReferenceTime) / (1000 * 60 * 60);
  const health = clamp(1 - elapsedHours / 48, 0, 1);

  const totalDevotional = rosaries + novenas + coronillas;
  const maturityTier: 1 | 2 | 3 = totalDevotional >= 20 ? 3 : totalDevotional >= 8 ? 2 : 1;
  const growthPhase: 1 | 2 | 3 = totalDevotional >= 20 ? 3 : totalDevotional >= 8 ? 2 : 1;

  const pointsScore =
    rosaries * 10 +
    novenas * 30 +
    coronillas * 15 +
    waterings * 2 +
    Math.floor(silence / 10) +
    community * 5 +
    streak * 3;

  const level = Math.max(0, Math.floor(Math.sqrt(pointsScore / 15)));

  const showEphemeralFlower = !!lastWateredAt && Date.now() - lastWateredAt < twentyFourHours;
  const showDove = streak >= 7 || community >= 5;
  const showDeer = waterLevel > 40;
  const consolidatedRosal = rosaries > 10;
  const elapsedSinceWater = lastWateredAt ? Date.now() - lastWateredAt : 0;
  const lifeRatio = Math.max(0, 1 - elapsedSinceWater / twentyFourHours);
  const wateringEffectStrength = clamp(lifeRatio * health, 0, 1);

  const dewPoints = wateringEffectStrength > 0.05
    ? [
        { x: 360, y: 360, r: 120, opacity: 0.12 * wateringEffectStrength },
        { x: 260, y: 310, r: 80, opacity: 0.08 * wateringEffectStrength },
        { x: 460, y: 320, r: 90, opacity: 0.09 * wateringEffectStrength },
      ]
    : [];

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
    lastGrowth: lastActivityTime,
    lastActivityTime,
    health,
    pointsScore,
    level,
    lastWateredAt,
    maturityTier,
    growthPhase,
    showEphemeralFlower,
    showDove,
    showDeer,
    dewPoints,
    consolidatedRosal,
    wateringEffectStrength,
    lifeRatio,
  };
}
