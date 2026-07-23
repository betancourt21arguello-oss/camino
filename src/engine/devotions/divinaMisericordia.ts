import type { Devotion, Section, Step } from "../types";
import { señal, padreNuestro, aveMaria, credo, señalCorta } from "./commonPrayers";

const eternoPadre = (n: number | string): Step => ({
  id: `eterno-padre-${n}`,
  type: "prayer",
  title: "Padre Nuestro (Misericordia)",
  role: "leader",
  duration: 8,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Eterno Padre, te ofrezco el Cuerpo, la Sangre, el Alma y la Divinidad de Tu dilectísimo Hijo, Nuestro Señor Jesucristo,",
  assemblyText: "en expiación de nuestros pecados y de los del mundo entero.",
});

const porSuDolorosaPasion = (id: string, repeat: number = 10): Step => ({
  id,
  type: "repeat-prayer",
  title: "Ave María (Misericordia)",
  role: "leader",
  duration: 6,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Por Su dolorosa Pasión,",
  assemblyText: "ten misericordia de nosotros y del mundo entero.",
});

const santoDios = (id = "santo-dios", repeat: number = 3): Step => ({
  id,
  type: "repeat-prayer",
  title: "Conclusión",
  role: "leader",
  duration: 6,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Santo Dios, Santo Fuerte, Santo Inmortal,",
  assemblyText: "ten misericordia de nosotros y del mundo entero.",
});

function decenaMisericordia(index: number): Section {
  const n = index + 1;
  return {
    id: `decena-${n}`,
    title: `${n}.ª Decena`,
    kind: "mystery",
    steps: [
      eternoPadre(n),
      porSuDolorosaPasion(`pasion-${n}`, 10),
      {
        id: `reflection-${n}`,
        type: "reflection",
        title: "Interludio de Misericordia",
        role: "all",
        duration: 120,
        transitions: ["time"],
        reflection: true,
        chat: true,
        music: "Canto de Meditación",
        text: "Contemplamos la insondable misericordia de Dios.",
      },
    ],
  };
}

export const divinaMisericordia: Devotion = {
  id: "divina-misericordia",
  title: "Coronilla",
  subtitle: "Divina Misericordia",
  sections: [
    {
      id: "introduccion",
      title: "Introducción",
      kind: "intro",
      steps: [
        señal(),
        padreNuestro(0),
        aveMaria("ave-intro", 1),
        credo(),
      ],
    },
    ...Array.from({ length: 5 }).map((_, i) => decenaMisericordia(i)),
    {
      id: "conclusion",
      title: "Conclusión",
      kind: "conclusion",
      steps: [
        santoDios("santo-dios", 3),
        señalCorta("senal-final"),
      ],
    },
  ],
};
