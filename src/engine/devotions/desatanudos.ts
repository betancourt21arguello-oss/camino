import type { Devotion, Section, Step } from "../types";
import { señal, padreNuestro, aveMaria, señalCorta } from "./commonPrayers";

const desatanudos = (id: string, repeat: number = 10): Step => ({
  id,
  type: "repeat-prayer",
  title: "María Desatanudos",
  role: "leader",
  duration: 5,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "María, que desatas los nudos,",
  assemblyText: "ruega por nosotros.",
});

const conclusion = (id = "conclusion"): Step => ({
  id,
  type: "prayer",
  title: "Oración Final",
  role: "leader",
  duration: 12,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Virgen María, Madre del bell’amore, Madre que nunca has abandonado a un niño que implora tu ayuda,",
  assemblyText: "Madre cuyas manos trabajan sin cesar por tus hijos amados, movidas por el amor divino y la infinita misericordia que existe en tu corazón...",
});

function misterioDesatanudos(index: number): Section {
  const n = index + 1;
  return {
    id: `misterio-${n}`,
    title: `${n}.º Nudo`,
    kind: "mystery",
    steps: [
      padreNuestro(n),
      aveMaria(`ave-inicial-${n}`, 1),
      desatanudos(`desatanudos-${n}`, 10),
      aveMaria(`ave-final-${n}`, 1),
      {
        id: `reflection-${n}`,
        type: "reflection",
        title: "Interludio",
        role: "all",
        duration: 120,
        transitions: ["time"],
        reflection: true,
        chat: true,
        music: "Canto a María",
        text: "Entregamos nuestros nudos a la Virgen María.",
      },
    ],
  };
}

export const mariaDesatanudos: Devotion = {
  id: "maria-desatanudos",
  title: "Coronilla",
  subtitle: "María Desatanudos",
  sections: [
    {
      id: "introduccion",
      title: "Introducción",
      kind: "intro",
      steps: [
        señal(),
      ],
    },
    ...Array.from({ length: 5 }).map((_, i) => misterioDesatanudos(i)),
    {
      id: "conclusion",
      title: "Conclusión",
      kind: "conclusion",
      steps: [
        conclusion(),
        señalCorta("senal-final"),
      ],
    },
  ],
};
