import type { Devotion, Section, Step } from "../types";
import {
  aveMaria,
  credo,
  gloria,
  jaculatoriaFatima,
  padreNuestro,
  salveRegina,
  señal,
  señalCorta,
} from "./commonPrayers";

export type RosarioSet = "gozosos" | "dolorosos" | "luminosos" | "gloriosos";

interface MysteryDef {
  title: string;
  desc: string;
  grace: string;
}

const GOZOSOS: MysteryDef[] = [
  {
    title: "La Encarnación del Hijo de Dios",
    desc: "El Arcángel Gabriel se aparece a la Virgen María y le anuncia que ha sido elegida para ser la Madre del Salvador. María responde con su «Hágase», acogiendo humildemente la voluntad de Dios.",
    grace: "Pide la gracia de la humildad y de una disponibilidad total al plan de Dios.",
  },
  {
    title: "La Visitación a Santa Isabel",
    desc: "María, al saber que su prima Isabel espera un hijo, viaja deprisa a servirla. Al saludarse, el niño salta de alegría en el seno de Isabel, y María entona el Magníficat.",
    grace: "Pide la gracia de la caridad pronta y del servicio vivido con alegría.",
  },
  {
    title: "El Nacimiento del Hijo de Dios en Belén",
    desc: "Sin hallar posada, Jesús nace en la pobreza de un pesebre. Los ángeles anuncian la Buena Nueva a los pastores, que acuden a adorar al Niño.",
    grace: "Pide la gracia de la pobreza de espíritu y del desapego de lo material.",
  },
  {
    title: "La Presentación del Niño en el Templo",
    desc: "Cumpliendo la Ley, María y José presentan al Niño en el Templo. El anciano Simeón lo reconoce como luz de las naciones y profetiza el dolor de la Madre.",
    grace: "Pide la gracia de la obediencia y de la pureza de intención.",
  },
  {
    title: "El Niño Jesús perdido y hallado en el Templo",
    desc: "A los doce años, Jesús se queda en Jerusalén. Tras tres días de búsqueda angustiosa, lo encuentran en el Templo, entre los maestros, escuchándolos y preguntándoles.",
    grace: "Pide la gracia de buscar a Jesús por encima de todas las cosas.",
  },
];

const DOLOROSOS: MysteryDef[] = [
  {
    title: "La Oración de Jesús en el Huerto",
    desc: "La víspera de su Pasión, Jesús ora en Getsemaní. Siente tal angustia que suda sangre, pero se abandona a la voluntad del Padre: «No se haga mi voluntad, sino la tuya».",
    grace: "Pide la gracia de la contrición y del cumplimiento amoroso de la voluntad del Padre.",
  },
  {
    title: "La Flagelación del Señor",
    desc: "Entregado a los romanos, Jesús es atado a la columna y cruelmente azotado. Sostiene en silencio los golpes que merecían nuestros pecados.",
    grace: "Pide la gracia de la mortificación cristiana y del dominio de los sentidos.",
  },
  {
    title: "La Coronación de Espinas",
    desc: "Los soldados se burlan de su realeza: lo visten de púrpura, le ponen una caña por cetro y le clavan una corona de espinas, rindiéndole falsos honores.",
    grace: "Pide la gracia del desprecio de la vanidad y del respeto humano.",
  },
  {
    title: "Jesús con la Cruz a cuestas",
    desc: "Debilitado, Jesús carga el madero por las calles de Jerusalén. Cae varias veces bajo el peso, pero continúa por amor, camino del Calvario.",
    grace: "Pide la gracia de la paciencia y de llevar con Cristo las cruces de cada día.",
  },
  {
    title: "La Crucifixión y Muerte del Señor",
    desc: "Jesús es clavado en la cruz y agoniza por horas. Perdona a sus verdugos, nos entrega a María por Madre y, finalmente, entrega su espíritu al Padre.",
    grace: "Pide la gracia de la perseverancia final y del amor a la Cruz de Cristo.",
  },
];

const LUMINOSOS: MysteryDef[] = [
  {
    title: "El Bautismo de Jesús en el Jordán",
    desc: "Jesús se bautiza por mano de Juan. Al salir del agua se abren los cielos, desciende el Espíritu en forma de paloma y el Padre proclama: «Este es mi Hijo amado».",
    grace: "Pide la gracia de vivir con fidelidad las promesas de tu Bautismo.",
  },
  {
    title: "Las Bodas de Caná",
    desc: "En una fiesta se acaba el vino. Por la intercesión de María, Jesús realiza su primer signo convirtiendo el agua en vino, y los discípulos creen en Él.",
    grace: "Pide la gracia de confiar siempre en la intercesión de la Virgen María.",
  },
  {
    title: "El Anuncio del Reino de Dios",
    desc: "Jesús recorre los caminos predicando el Evangelio, perdonando pecados y sanando enfermos, llamando a todos a la conversión y a acoger el Reino.",
    grace: "Pide la gracia de la conversión continua y de una fe viva en el Evangelio.",
  },
  {
    title: "La Transfiguración del Señor",
    desc: "En el Tabor, Jesús se transfigura ante Pedro, Santiago y Juan, mostrando su gloria divina. Una voz del cielo dice: «Escúchenlo».",
    grace: "Pide la gracia del deseo del cielo y de la escucha dócil de Cristo.",
  },
  {
    title: "La Institución de la Eucaristía",
    desc: "En la Última Cena, Jesús toma pan y vino, los bendice y los entrega a los suyos como su Cuerpo y su Sangre, alimento de vida eterna.",
    grace: "Pide la gracia de amar la Eucaristía y de vivirla cada día.",
  },
];

const GLORIOSOS: MysteryDef[] = [
  {
    title: "La Resurrección del Hijo de Dios",
    desc: "Al tercer día, Jesús resucita triunfante del sepulcro, venciendo a la muerte y asegurando la vida eterna a cuantos creen en Él.",
    grace: "Pide la gracia de una fe viva y de la alegría pascual.",
  },
  {
    title: "La Ascensión del Señor al Cielo",
    desc: "Cuarenta días después, tras enviar a los suyos a predicar el Evangelio, Jesús asciende en cuerpo y alma al cielo y se sienta a la derecha del Padre.",
    grace: "Pide la gracia de la esperanza y del anhelo ardiente del cielo.",
  },
  {
    title: "La Venida del Espíritu Santo",
    desc: "En Pentecostés, el Espíritu desciende en lenguas de fuego sobre los apóstoles y María, llenándolos de valentía y sabiduría para fundar la Iglesia.",
    grace: "Pide la gracia de los dones del Espíritu Santo y de su docilidad.",
  },
  {
    title: "La Asunción de la Virgen María",
    desc: "Al terminar su vida terrena, la Virgen, preservada del pecado, es llevada en cuerpo y alma al cielo, sin conocer la corrupción del sepulcro.",
    grace: "Pide la gracia de una santa muerte y de una tierna devoción a María.",
  },
  {
    title: "La Coronación de la Virgen como Reina del Cielo",
    desc: "En el cielo, la Trinidad corona a María como Reina de ángeles y santos, constituyéndola mediadora e intercesora de toda la humanidad.",
    grace: "Pide la gracia de la perseverancia y de la corona de gloria eterna.",
  },
];

const SETS: Record<RosarioSet, { label: string; theme: string; mysteries: MysteryDef[] }> = {
  gozosos: { label: "Gozosos", theme: "la encarnación y la infancia de Jesús", mysteries: GOZOSOS },
  dolorosos: { label: "Dolorosos", theme: "la pasión y muerte de Jesucristo", mysteries: DOLOROSOS },
  luminosos: { label: "Luminosos", theme: "el ministerio público de Cristo, luz del mundo", mysteries: LUMINOSOS },
  gloriosos: { label: "Gloriosos", theme: "el triunfo sobre la muerte y la gloria de Dios", mysteries: GLORIOSOS },
};

function mysterySection(index: number, m: MysteryDef): Section {
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
        duration: 14,
        transitions: ["time", "gesture", "leader"],
        text: m.desc,
      } satisfies Step,
      padreNuestro(n),
      aveMaria(`ave-${n}`, 10),
      gloria(n),
      jaculatoriaFatima(n),
      {
        id: `reflection-${n}`,
        type: "reflection",
        title: "Contemplación del misterio",
        role: "all",
        duration: 120,
        transitions: ["time"],
        reflection: true,
        chat: true,
        music: "Canto de meditación",
        text: m.grace,
      } satisfies Step,
    ],
  };
}

function intro(): Section {
  return {
    id: "introduccion",
    title: "Introducción",
    kind: "intro",
    steps: [señal(), credo(), padreNuestro(0), aveMaria("ave-intro", 3), gloria(0)],
  };
}

function conclusion(): Section {
  return {
    id: "conclusion",
    title: "Conclusión",
    kind: "conclusion",
    steps: [salveRegina(), señalCorta("senal-final")],
  };
}

function buildRosario(set: RosarioSet): Devotion {
  const cfg = SETS[set];
  return {
    id: `rosario-${set}`,
    title: "Rosario Comunitario Vivo",
    subtitle: `Misterios ${cfg.label}`,
    sections: [intro(), ...cfg.mysteries.map((m, i) => mysterySection(i, m)), conclusion()],
  };
}

export const ROSARIO_DESTRUCTIONS: Record<string, Devotion> = {
  "rosario-gozosos": buildRosario("gozosos"),
  "rosario-dolorosos": buildRosario("dolorosos"),
  "rosario-luminosos": buildRosario("luminosos"),
  "rosario-gloriosos": buildRosario("gloriosos"),
};

/** Lunes y Sábado → Gozosos · Martes y Viernes → Dolorosos ·
 *  Miércoles y Domingo → Gloriosos · Jueves → Luminosos. */
const DAY_TO_SET: Record<number, RosarioSet> = {
  0: "gloriosos",
  1: "gozosos",
  2: "dolorosos",
  3: "gloriosos",
  4: "luminosos",
  5: "dolorosos",
  6: "gozosos",
};

import { caracasNow } from "../../utils/caracas";

export function rosarioSetForDate(date: Date = caracasNow()): RosarioSet {
  return DAY_TO_SET[date.getDay()];
}

export function devotionIdForToday(date: Date = caracasNow()): string {
  return `rosario-${rosarioSetForDate(date)}`;
}

export function setLabelFor(set: RosarioSet): string {
  return SETS[set].label;
}

export function setThemeFor(set: RosarioSet): string {
  return SETS[set].theme;
}
