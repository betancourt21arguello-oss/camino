// ============================================================
//  CONTENIDO LITÚRGICO DEL DÍA
//  Estructura devuelta por el MOTOR PRINCIPAL: Gemini API.
//  Una (1) llamada al día genera TODO este objeto y lo cachea.
//  (Ver instructivo.md → función Cloudflare Worker "daily-generate".)
// ============================================================

export interface Reading {
  ref: string;
  title: string;
  body: string;
}

export interface MarianMessage {
  source: "Betania" | "Medjugorje";
  text: string;
  relevant: boolean;
  date?: string;
  sourceUrl?: string;
}

export interface RelevantMessage {
  text: string;
  relevant: boolean;
  date?: string;
  sourceUrl?: string;
}

export interface DailyLiturgy {
  date: string; // ISO yyyy-mm-dd
  weekday: string; // "Martes"
  season: string; // "Tiempo Ordinario"
  liturgicalColor: string;
  isSolemnity: boolean;
  liturgicalRank?: "solemnidad" | "fiesta" | "memoria" | "feria";
  saint: {
    name: string;
    title: string;
    initial?: string;
    imageUrl?: string;
    story: string;
    exampleToday: string;
    gospelConnection: string;
    venezuelaRelevance: string;
  };
  quote: { text: string; ref: string };
  gospel: Reading;
  psalm: Reading;
  firstReading: Reading;
  secondReading?: Reading;
  laudes: { title: string; body: string };
  angelus: { title: string; body: string };
  reflection: string;
  imagePrompt: string; // usado para generar la imagen del día
  imageUrl?: string;
  suggestedNovenas?: { title: string; reason: string }[];
  messages?: {
    betania?: RelevantMessage;
    medjugorje?: RelevantMessage;
    popeLeoXiv?: RelevantMessage;
  };
  /** compatibilidad temporal con payload anterior */
  marian?: MarianMessage;
}

/** Evento futuro del calendario litúrgico. */
export interface LiturgicalEvent {
  date: string; // ISO
  day: number;
  label: string; // "Santiago Apóstol"
  rank: "solemnidad" | "fiesta" | "memoria" | "feria";
}
