import type { Devotion, Section, Step } from "../types";
import { señal, señalCorta } from "./commonPrayers";

const invocacion = (id = "invocacion"): Step => ({
  id,
  type: "prayer",
  title: "Invocación al Espíritu Santo",
  role: "leader",
  duration: 8,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Ven, Espíritu Santo, llena los corazones de Tus fieles y enciende en ellos el fuego de Tu amor. Envía Tu Espíritu y serán creados.",
  assemblyText: "Y renovarás la faz de la tierra.",
});

const venEspiritu = (id: string, repeat: number = 7): Step => ({
  id,
  type: "repeat-prayer",
  title: "Ven, Espíritu Santo",
  role: "leader",
  duration: 5,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Ven, Espíritu Santo,",
  assemblyText: "y llena los corazones de tus fieles.",
});

const conclusion = (id = "conclusion"): Step => ({
  id,
  type: "prayer",
  title: "Oración Final",
  role: "leader",
  duration: 12,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Oh Espíritu Santo, Alma de mi alma, Te adoro. Ilumíname, guíame, fortaléceme y consuélame. Dime qué debo hacer y ordéname hacerlo.",
  assemblyText: "Prometo someterme a todo lo que Tú quieras de mí y aceptar todo lo que permitas que me suceda. Solo dame a conocer Tu voluntad. Amén.",
});

function misterioEspirituSanto(index: number): Section {
  const n = index + 1;
  const misterios = [
    "Jesús es concebido por obra del Espíritu Santo.",
    "El Espíritu Santo desciende sobre Jesús en el Jordán.",
    "Jesús muere en la cruz y entrega su Espíritu.",
    "Jesús resucitado da el Espíritu Santo a los apóstoles.",
    "El Espíritu Santo desciende en Pentecostés.",
  ];
  return {
    id: `misterio-${n}`,
    title: `${n}.º Misterio`,
    kind: "mystery",
    steps: [
      {
        id: `anuncio-${n}`,
        type: "mystery-announce",
        title: misterios[index],
        role: "all",
        duration: 10,
        transitions: ["time", "gesture", "leader"],
        text: misterios[index],
      },
      invocacion(`invocacion-${n}`),
      venEspiritu(`ven-${n}`, 7),
      {
        id: `reflection-${n}`,
        type: "reflection",
        title: "Interludio",
        role: "all",
        duration: 120,
        transitions: ["time"],
        reflection: true,
        chat: true,
        music: "Veni Creator Spiritus",
        text: misterios[index],
      },
    ],
  };
}

export const espirituSanto: Devotion = {
  id: "espiritu-santo",
  title: "Coronilla",
  subtitle: "Espíritu Santo",
  sections: [
    {
      id: "introduccion",
      title: "Introducción",
      kind: "intro",
      steps: [
        señal(),
      ],
    },
    ...Array.from({ length: 5 }).map((_, i) => misterioEspirituSanto(i)),
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
