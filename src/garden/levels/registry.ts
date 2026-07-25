import type { LevelConfig } from "./types";

export const LEVEL_REGISTRY: Record<number, LevelConfig> = {
  1: { flowerBonus: 2, lightBonus: 1, plantBonus: 1, rockBonus: 0, particleBonus: 0, butterflyBonus: 0, lightRayBonus: 0 },
  2: { flowerBonus: 3, lightBonus: 1, plantBonus: 2, rockBonus: 1, particleBonus: 0, butterflyBonus: 0, lightRayBonus: 0 },
  3: { flowerBonus: 4, lightBonus: 2, plantBonus: 3, rockBonus: 1, particleBonus: 0, butterflyBonus: 0, lightRayBonus: 0 },
  4: { flowerBonus: 5, lightBonus: 2, plantBonus: 4, rockBonus: 2, particleBonus: 1, butterflyBonus: 0, lightRayBonus: 0 },
  5: { flowerBonus: 6, lightBonus: 3, plantBonus: 5, rockBonus: 2, particleBonus: 1, butterflyBonus: 1, lightRayBonus: 1 },
  6: { flowerBonus: 7, lightBonus: 3, plantBonus: 6, rockBonus: 3, particleBonus: 1, butterflyBonus: 1, lightRayBonus: 1 },
  7: { flowerBonus: 8, lightBonus: 4, plantBonus: 7, rockBonus: 3, particleBonus: 2, butterflyBonus: 1, lightRayBonus: 1 },
  8: { flowerBonus: 9, lightBonus: 4, plantBonus: 8, rockBonus: 4, particleBonus: 2, butterflyBonus: 2, lightRayBonus: 1 },
  9: { flowerBonus: 10, lightBonus: 5, plantBonus: 9, rockBonus: 4, particleBonus: 2, butterflyBonus: 2, lightRayBonus: 1 },
  10: { flowerBonus: 12, lightBonus: 5, plantBonus: 10, rockBonus: 5, particleBonus: 3, butterflyBonus: 2, lightRayBonus: 2 },
};