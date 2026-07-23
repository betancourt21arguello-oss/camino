import type { Devotion, Section, Step } from "../types";
import { señal, señalCorta } from "./commonPrayers";

const descansoEterno = (id: string, repeat: number = 4): Step => ({
  id,
  type: "repeat-prayer",
  title: "Descanso Eterno",
  role: "leader",
  duration: 6,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Ofreciendo nuestras oraciones por el descanso eterno y la purificación de las almas.",
  assemblyText: "Señor, dales el descanso eterno y brille para ellas la luz perpetua. Amén.",
});

function seriePurgatorio(index: number): Section {
  const n = index + 1;
  return {
    id: `serie-${n}`,
    title: `Serie ${n}`,
    kind: "mystery",
    steps: [
      descansoEterno(`descanso-${n}`, 4),
    ],
  };
}

export const almasPurgatorio: Devotion = {
  id: "almas-purgatorio",
  title: "Coronilla",
  subtitle: "Almas del Purgatorio",
  sections: [
    {
      id: "introduccion",
      title: "Introducción",
      kind: "intro",
      steps: [
        señal(),
        {
          id: "anuncio",
          type: "prayer",
          title: "Intención",
          role: "leader",
          duration: 8,
          transitions: ["time", "consensus", "leader", "gesture"],
          leaderText: "Recorramos las trece series de cuatro granos cada una, ofreciendo nuestras oraciones por el descanso eterno y la purificación de las almas.",
        }
      ],
    },
    ...Array.from({ length: 13 }).map((_, i) => seriePurgatorio(i)),
    {
      id: "conclusion",
      title: "Conclusión",
      kind: "conclusion",
      steps: [
        señalCorta("senal-final"),
      ],
    },
  ],
};
