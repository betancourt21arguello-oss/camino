import type { Devotion, Section, Step } from "../types";

// ---- Reusable prayer step factories (NO repeated strings) --------------

const señal = (): Step => ({
  id: "senal",
  type: "sign",
  title: "Señal de la Cruz",
  role: "all",
  duration: 6,
  transitions: ["time", "gesture", "leader"],
  text:
    "Por la señal de la Santa Cruz, de nuestros enemigos líbranos, Señor, Dios nuestro. En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.",
});

const credo = (): Step => ({
  id: "credo",
  type: "creed",
  title: "Credo",
  role: "all",
  duration: 10,
  transitions: ["time", "gesture", "leader"],
  text:
    "Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra… y en Jesucristo, su único Hijo, nuestro Señor. Amén.",
});

const padreNuestro = (n: number): Step => ({
  id: `pn-${n}`,
  type: "prayer",
  title: "Padre Nuestro",
  role: "leader",
  duration: 8,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText:
    "Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo.",
  assemblyText:
    "Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal. Amén.",
});

/** Repeat() — una sola definición, N iteraciones gestionadas por el motor. */
const aveMaria = (id: string, repeat: number): Step => ({
  id,
  type: "repeat-prayer",
  title: "Ave María",
  role: "leader",
  duration: 6,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText:
    "Dios te salve, María, llena eres de gracia; el Señor es contigo. Bendita tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús.",
  assemblyText:
    "Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.",
});

const gloria = (n: number): Step => ({
  id: `gloria-${n}`,
  type: "doxology",
  title: "Gloria",
  role: "leader",
  duration: 6,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Gloria al Padre, y al Hijo, y al Espíritu Santo.",
  assemblyText:
    "Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.",
});

const jaculatoria = (n: number): Step => ({
  id: `fatima-${n}`,
  type: "invocation",
  title: "Oh Jesús mío",
  role: "all",
  duration: 6,
  transitions: ["time", "consensus", "leader", "gesture"],
  text:
    "¡Oh Jesús mío! Perdónanos nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia.",
});

// ---- Mystery section builder ------------------------------------------

const DOLOROSOS: { title: string; meditation: string }[] = [
  {
    title: "La Oración en el Huerto",
    meditation:
      "Contempla a Jesús que, en Getsemaní, acepta el cáliz de la Pasión por amor a nosotros. Pide la gracia de la contrición.",
  },
  {
    title: "La Flagelación del Señor",
    meditation:
      "Contempla a Jesús azotado por nuestros pecados. Pide la gracia de la mortificación de los sentidos.",
  },
  {
    title: "La Coronación de Espinas",
    meditation:
      "Contempla a Jesús coronado de espinas y escarnecido. Pide la gracia de la humildad.",
  },
  {
    title: "Jesús con la Cruz a cuestas",
    meditation:
      "Contempla a Jesús cargando la Cruz camino del Calvario. Pide la gracia de la paciencia en las pruebas.",
  },
  {
    title: "La Crucifixión y Muerte de Jesús",
    meditation:
      "Contempla a Jesús que entrega su vida en la Cruz por nuestra salvación. Pide la gracia de perseverar hasta el fin.",
  },
];

function mysterySection(index: number): Section {
  const m = DOLOROSOS[index];
  const n = index + 1;
  return {
    id: `misterio-${n}`,
    title: `${n}.º Misterio`,
    kind: "mystery",
    steps: [
      {
        id: `announce-${n}`,
        type: "mystery-announce",
        title: m.title,
        role: "all",
        duration: 10,
        transitions: ["time", "leader", "gesture"],
        text: m.meditation,
      },
      padreNuestro(n),
      aveMaria(`ave-${n}`, 10),
      gloria(n),
      jaculatoria(n),
      // Después de cada misterio → estado Reflection (nunca avanzar directo)
      {
        id: `reflection-${n}`,
        type: "reflection",
        title: "Interludio Espiritual",
        role: "all",
        duration: 120,
        transitions: ["time"],
        reflection: true,
        chat: true,
        music: "Canto de Meditación · Coro Santa Cecilia",
        text: m.meditation,
      },
    ],
  };
}

// ---- The full Devotion (pure data) -----------------------------------

export const rosarioDolorosos: Devotion = {
  id: "rosario-dolorosos",
  title: "Rosario Comunitario Vivo",
  subtitle: "Misterios Dolorosos",
  sections: [
    {
      id: "introduccion",
      title: "Introducción",
      kind: "intro",
      steps: [
        señal(),
        credo(),
        padreNuestro(0),
        aveMaria("ave-intro", 3),
        gloria(0),
      ],
    },
    ...DOLOROSOS.map((_, i) => mysterySection(i)),
    {
      id: "conclusion",
      title: "Conclusión",
      kind: "conclusion",
      steps: [
        {
          id: "salve",
          type: "prayer",
          title: "Salve",
          role: "all",
          duration: 10,
          transitions: ["time", "consensus", "leader", "gesture"],
          text:
            "Dios te salve, Reina y Madre de misericordia, vida, dulzura y esperanza nuestra; Dios te salve. A ti clamamos los desterrados hijos de Eva… Amén.",
        },
        {
          id: "final",
          type: "ending",
          title: "Oración Final",
          role: "all",
          duration: 8,
          transitions: ["time", "gesture", "leader"],
          text:
            "Señor, que este Rosario sea un reflejo de tu amor. Que nuestra oración no se apague nunca. Amén.",
        },
      ],
    },
  ],
};
