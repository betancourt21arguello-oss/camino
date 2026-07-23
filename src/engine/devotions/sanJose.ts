import type { Devotion, Section, Step } from "../types";
import { señal, señalCorta } from "./commonPrayers";

const primerosTres = (id = "primeros-tres", repeat: number = 3): Step => ({
  id,
  type: "repeat-prayer",
  title: "Invocación inicial",
  role: "leader",
  duration: 6,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "San José, padre putativo de Jesús Cristo y verdadero esposo de la Virgen María,",
  assemblyText: "ruega por nosotros y por aquellos que morirán hoy (noche).",
});

const custodio = (n: number | string): Step => ({
  id: `custodio-${n}`,
  type: "prayer",
  title: "Custodio de la Sagrada Familia",
  role: "leader",
  duration: 6,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "San José, custodio de la Sagrada Familia,",
  assemblyText: "bendice a nuestras familias.",
});

const ruegaPorNosotros = (id: string, repeat: number = 10): Step => ({
  id,
  type: "repeat-prayer",
  title: "San José",
  role: "leader",
  duration: 5,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "San José,",
  assemblyText: "ruega por nosotros.",
});

function decenaSanJose(index: number): Section {
  const n = index + 1;
  return {
    id: `decena-${n}`,
    title: `${n}.ª Decena`,
    kind: "mystery",
    steps: [
      custodio(n),
      ruegaPorNosotros(`ruega-${n}`, 10),
      {
        id: `reflection-${n}`,
        type: "reflection",
        title: "Interludio",
        role: "all",
        duration: 120,
        transitions: ["time"],
        reflection: true,
        chat: true,
        music: "Canto a San José",
        text: "Reflexionamos sobre las virtudes de San José.",
      },
    ],
  };
}

export const sanJose: Devotion = {
  id: "san-jose",
  title: "Coronilla",
  subtitle: "San José",
  sections: [
    {
      id: "introduccion",
      title: "Introducción",
      kind: "intro",
      steps: [
        señal(),
        primerosTres("primeros-tres", 3),
      ],
    },
    ...Array.from({ length: 5 }).map((_, i) => decenaSanJose(i)),
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
