import type { Devotion } from "../types";
import { rosarioDolorosos } from "./rosarioDolorosos";
import { divinaMisericordia } from "./divinaMisericordia";
import { sanJose } from "./sanJose";
import { espirituSanto } from "./espirituSanto";
import { almasPurgatorio } from "./almasPurgatorio";
import { mariaDesatanudos } from "./desatanudos";

export const DEVOTIONS: Record<string, Devotion> = {
  "rosario-dolorosos": rosarioDolorosos,
  "divina-misericordia": divinaMisericordia,
  "san-jose": sanJose,
  "espiritu-santo": espirituSanto,
  "almas-purgatorio": almasPurgatorio,
  "maria-desatanudos": mariaDesatanudos,
};

export const DEVOTION_LIST = Object.values(DEVOTIONS);
