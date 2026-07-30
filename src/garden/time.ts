/* ============================================================================
 * src/garden/time.ts — Ciclo horario local del jardín
 * Calcula `timeOfDay` con la hora del dispositivo y expone la paleta cromática,
 * la iluminación, la longitud de sombras y la apertura floral de cada momento.
 * ==========================================================================*/
import type { TimeOfDay, TimePalette, GardenSeason } from "./types";
import { caracasNow } from "../utils/caracas";

/** madrugada 4–7 · mañana 7–11 · mediodía 11–18 · noche 18–4 */
export function computeTimeOfDay(d: Date = caracasNow()): TimeOfDay {
  const h = d.getHours();
  if (h >= 4 && h < 7) return "madrugada";
  if (h >= 7 && h < 11) return "manana";
  if (h >= 11 && h < 18) return "mediodia";
  return "noche";
}

const BASE: Record<TimeOfDay, TimePalette> = {
  madrugada: {
    id: "madrugada",
    label: "Madrugada",
    sky: ["#242a52", "#454a7c", "#93879f"],
    ambientTint: "rgb(66 78 142 / 1)",
    ambientOpacity: 0.3,
    lightWarmth: 0.18,
    shadowLength: 1.7,
    shadowOpacity: 0.09,
    saturation: 0.7,
    brightness: 0.76,
    fogOpacity: 0.32,
    bloomOpen: 0.12,
    dewActive: true,
    candleGlow: 0.75,
    starOpacity: 0.55,
    sunX: 0.18,
    sunY: 0.86,
    sunTone: "rgb(160 180 240 / 0.5)",
  },
  manana: {
    id: "manana",
    label: "Mañana",
    sky: ["#8ec4e2", "#cfe3ea", "#fbe6c6"],
    ambientTint: "rgb(255 206 132 / 1)",
    ambientOpacity: 0.14,
    lightWarmth: 0.86,
    shadowLength: 1.4,
    shadowOpacity: 0.13,
    saturation: 1.02,
    brightness: 1.04,
    fogOpacity: 0.11,
    bloomOpen: 0.88,
    dewActive: true,
    candleGlow: 0.22,
    starOpacity: 0,
    sunX: 0.24,
    sunY: 0.24,
    sunTone: "rgb(255 232 176 / 0.95)",
  },
  mediodia: {
    id: "mediodia",
    label: "Mediodía",
    sky: ["#79b3d8", "#aed4e8", "#e4f2f8"],
    ambientTint: "rgb(255 255 240 / 1)",
    ambientOpacity: 0.04,
    lightWarmth: 0.55,
    shadowLength: 0.68,
    shadowOpacity: 0.2,
    saturation: 1.1,
    brightness: 1.05,
    fogOpacity: 0.03,
    bloomOpen: 1,
    dewActive: false,
    candleGlow: 0.14,
    starOpacity: 0,
    sunX: 0.52,
    sunY: 0.12,
    sunTone: "rgb(255 248 214 / 0.95)",
  },
  noche: {
    id: "noche",
    label: "Noche",
    sky: ["#0b1130", "#1a2249", "#3a4270"],
    ambientTint: "rgb(18 28 68 / 1)",
    ambientOpacity: 0.44,
    lightWarmth: 0.1,
    shadowLength: 1.9,
    shadowOpacity: 0.07,
    saturation: 0.56,
    brightness: 0.6,
    fogOpacity: 0.15,
    bloomOpen: 0.26,
    dewActive: false,
    candleGlow: 1,
    starOpacity: 1,
    sunX: 0.74,
    sunY: 0.18,
    sunTone: "rgb(214 226 255 / 0.8)",
  },
};

/** Desplazamiento cromático suave según la temporada litúrgica. */
const SEASON_SHIFT: Record<GardenSeason, { hue: number; sat: number }> = {
  advent:    { hue: -14, sat: -0.06 },
  christmas: { hue: -6,  sat: 0.02 },
  lent:      { hue: -18, sat: -0.12 },
  easter:    { hue: 8,   sat: 0.08 },
  pentecost: { hue: 12,  sat: 0.06 },
  ordinary:  { hue: 0,   sat: 0 },
};

/** Paleta final = momento del día + matiz de la temporada. */
export function timePalette(time: TimeOfDay, season: GardenSeason): TimePalette {
  const base = BASE[time];
  const shift = SEASON_SHIFT[season];
  return {
    ...base,
    saturation: Math.max(0.4, base.saturation + shift.sat),
    seasonHueShift: shift.hue,
  };
}

export const TIME_LABEL: Record<TimeOfDay, string> = {
  madrugada: "Madrugada",
  manana: "Mañana",
  mediodia: "Mediodía",
  noche: "Noche",
};

export const TIME_ICON: Record<TimeOfDay, string> = {
  madrugada: "🌒",
  manana: "🌤️",
  mediodia: "☀️",
  noche: "🌙",
};
