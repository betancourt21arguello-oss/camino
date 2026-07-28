// ============================================================
//  CONTENIDO LITÚRGICO DEL DÍA — contrato con Gemini
//  Una llamada diaria genera todo esto y se cachea en el Worker.
//  Fuentes: texto bíblico en español latinoamericano (Venezuela),
//  liturgia de la Conferencia Episcopal Venezolana.
// ============================================================

export interface Reading {
  ref: string;
  title: string;
  body: string;
}

export interface GospelReading extends Reading {
  /** Evangelista: "san Mateo" / "san Marcos" / "san Lucas" / "san Juan". */
  evangelist?: string;
  /** Aclamación inicial que proclama el lector. */
  introFormula?: string;
  /** Diálogo final: "Palabra del Señor" → respuesta del pueblo. */
  closingProclaim?: string;
  closingResponse?: string;
  /** Ritual de las tres cruces (frente, labios, pecho) antes de la lectura. */
  threeCrosses?: boolean;
  /** Fuente de la imagen (arte sacro católico, dominio público). */
  imageSource?: string;
}

export interface RelevantMessage {
  source: string;
  text: string;
  relevant: boolean;
  date?: string;
  sourceUrl?: string;
}

/** Una parte de una Hora de la Liturgia de las Horas. */
export interface HourPart {
  kind: "invitatory" | "hymn" | "psalmody" | "reading" | "gospelCanticle" | "intercessions" | "ourFather" | "concludingPrayer" | "marianAntiphon" | "examination" | "commendation" | "response" | "video";
  label: string;
  text: string;
  rubric?: string;
  response?: string;
  content?: string;
  type?: string;
}

export interface HourLiturgy {
  title: string;
  /** Resumen en una línea (compat con reader antiguo). */
  body: string;
  /** Hora del día sugerida "HH:MM". */
  hour?: string;
  /** Tono ambiental para el portal: dawn | noon | dusk | night */
  mood?: "dawn" | "noon" | "dusk" | "night";
  parts: HourPart[];
}

export interface AngelusVerse {
  leader: string;
  response?: string;
  /** Fracción del audio [0..1] en la que empieza este verso (sincronización). */
  at?: number;
}

export interface AngelusLiturgy {
  title: string;
  body: string;
  verses: AngelusVerse[];
  /** URL del audio del Ángelus (p. ej. Papa Francisco en español). */
  audioUrl?: string;
  /** Etiqueta del audio: "Papa Francisco · español" */
  audioLabel?: string;
  closingPrayer?: string;
}

export interface CatechismLesson {
  /** Número del Catecismo (CEC), p. ej. "169" o "1846-1848". */
  number: string;
  title: string;
  text: string;
  /** Aplicación práctica para hoy, una frase. */
  applyToday: string;
}

export interface OnThisDay {
  title: string;
  /** Categoría: milagro eucarístico, aparición mariana, evento bíblico, santo, hecho histórico. */
  category: string;
  text: string;
  /** Por qué importa a los feligreses en Venezuela. */
  venezuela: string;
}

export interface DailyLiturgy {
  date: string;
  weekday: string;
  season: string;
  liturgicalColor: string;
  isSolemnity: boolean;
  liturgicalRank?: "solemnidad" | "fiesta" | "memoria" | "feria";
  saint: {
    name: string;
    title: string;
    initial?: string;
    imageUrl?: string;
    /** Historia rica: origen, hechos decisivos, martirio/obra. */
    story: string;
    /** Aspectos / hitos destacados (lista). */
    highlights?: string[];
    /** Lecciones concretas para nosotros hoy. */
    lessons?: string[];
    exampleToday: string;
    gospelConnection: string;
    venezuelaRelevance: string;
    /** Oración propia del santo, si existe. */
    prayer?: string;
  };
  quote: { text: string; ref: string };
  gospel: GospelReading;
  psalm: Reading;
  firstReading: Reading;
  secondReading?: Reading;
  laudes: HourLiturgy;
  vespers?: HourLiturgy;
  compline?: HourLiturgy;
  angelus: AngelusLiturgy;
  reflection: string;
  imagePrompt: string;
  imageUrl?: string;
  suggestedNovenas?: { title: string; reason: string }[];
  catechism?: CatechismLesson;
  onThisDay?: OnThisDay;
  messages?: RelevantMessage[];
  /** compat temporal */
  marian?: { source: string; text: string; relevant: boolean };
}

export interface LiturgicalEvent {
  date: string;
  day: number;
  label: string;
  rank: "solemnidad" | "fiesta" | "memoria" | "feria";
}
