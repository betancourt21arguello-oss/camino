import type { Devotion, Section } from "../types";
import { señal, credo, padreNuestro, aveMaria, gloria, jaculatoriaFatima, salveRegina } from "./commonPrayers";

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
      jaculatoriaFatima(n),
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
        salveRegina(),
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
