import type { LevelConfig } from "./types";
import { LEVEL_REGISTRY } from "./registry";
import { LevelModule } from "./module";

export function resolveLevel(level: number): LevelConfig {
  const l = Math.max(0, level);
  const config: LevelConfig = {
    flowerBonus: 0,
    lightBonus: 0,
    plantBonus: 0,
    rockBonus: 0,
    particleBonus: 0,
    butterflyBonus: 0,
    lightRayBonus: 0,
  };
  for (let i = 1; i <= l; i++) {
    const mod = LEVEL_REGISTRY[i];
    if (mod) {
      config.flowerBonus += mod.flowerBonus;
      config.lightBonus += mod.lightBonus;
      config.plantBonus += mod.plantBonus;
      config.rockBonus += mod.rockBonus;
      config.particleBonus += mod.particleBonus;
      config.butterflyBonus += mod.butterflyBonus;
      config.lightRayBonus += mod.lightRayBonus;
    }
  }
  return config;
}

export { LevelModule };