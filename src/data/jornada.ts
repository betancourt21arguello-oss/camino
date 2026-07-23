import type { DailyLiturgy } from "../liturgy/types";

export type JornadaStepKind =
  | "greeting"
  | "breath"
  | "invocation"
  | "quote"
  | "reading"
  | "gospel"
  | "reflection"
  | "silence"
  | "personal"
  | "final";

export interface JornadaStep {
  id: string;
  kind: JornadaStepKind;
  eyebrow?: string;    // Small label above heading (e.g. "EVANGELIO")
  heading: string;     // Main title
  citation?: string;   // Bible citation
  body?: string;       // Long-form text (readings, prayers)
  hint?: string;       // Small subtitle / instruction
  cta?: string;        // Custom CTA label
}

/**
 * Construye dinámicamente la jornada a partir de la liturgia diaria de Gemini.
 * Cada paso tiene una estructura consistente: eyebrow / heading / citation / body.
 */
export function buildJornadaSteps(liturgy: DailyLiturgy | null): JornadaStep[] {
  const L = liturgy;
  const saintName = L?.saint?.name;
  const weekday = L?.weekday ?? "hoy";

  const steps: JornadaStep[] = [];

  // 1 · Saludo
  steps.push({
    id: "greeting",
    kind: "greeting",
    eyebrow: `Comenzar · ${weekday}`,
    heading: "Dios te bendiga",
    hint: saintName
      ? `Hoy caminas con ${saintName}.`
      : "Detengamos el ruido y demos gracias.",
    cta: "Comenzar en paz",
  });

  // 2 · Respiración
  steps.push({
    id: "breath",
    kind: "breath",
    eyebrow: "Preparar el corazón",
    heading: "Tres respiraciones lentas",
    hint: "Pon este día en las manos de Dios.",
  });

  // 3 · Invocación al Espíritu Santo
  steps.push({
    id: "invocation",
    kind: "invocation",
    eyebrow: "Invocación",
    heading: "Ven, Espíritu Santo",
    body:
      "Ven, Espíritu Santo, ven por medio de la poderosa intercesión del Inmaculado Corazón de María, tu amadísima Esposa.\n\nOh Espíritu Santo, Amor del Padre y del Hijo, inspírame siempre lo que debo pensar, lo que debo decir, cómo debo decirlo, lo que debo callar, cómo debo actuar y lo que debo hacer, para gloria de Dios, bien de las almas y mi propia santificación.\n\nAmén.",
  });

  // 4 · Frase para hoy
  if (L?.quote?.text) {
    steps.push({
      id: "quote",
      kind: "quote",
      eyebrow: "Una frase para hoy",
      heading: `"${L.quote.text}"`,
      citation: L.quote.ref,
    });
  }

  // 5 · Primera lectura
  if (L?.firstReading?.body) {
    steps.push({
      id: "first-reading",
      kind: "reading",
      eyebrow: "Primera lectura",
      heading: L.firstReading.title || "Palabra de Dios",
      citation: L.firstReading.ref,
      body: L.firstReading.body,
    });
  }

  // 6 · Salmo
  if (L?.psalm?.body) {
    steps.push({
      id: "psalm",
      kind: "reading",
      eyebrow: "Salmo del día",
      heading: L.psalm.title || "Salmo responsorial",
      citation: L.psalm.ref,
      body: L.psalm.body,
    });
  }

  // 7 · Segunda lectura
  if (L?.secondReading?.body) {
    steps.push({
      id: "second-reading",
      kind: "reading",
      eyebrow: "Segunda lectura",
      heading: L.secondReading.title || "Palabra de Dios",
      citation: L.secondReading.ref,
      body: L.secondReading.body,
    });
  }

  // 8 · Evangelio
  if (L?.gospel?.body) {
    steps.push({
      id: "gospel",
      kind: "gospel",
      eyebrow: "Evangelio",
      heading: L.gospel.title || "Palabra del Señor",
      citation: L.gospel.ref,
      body: L.gospel.body,
    });
  }

  // 9 · Reflexión de Gemini
  if (L?.reflection) {
    steps.push({
      id: "reflection",
      kind: "reflection",
      eyebrow: "Reflexión",
      heading: "Lo que la Palabra dice hoy",
      body: L.reflection,
    });
  }

  // 10 · Silencio
  steps.push({
    id: "silence",
    kind: "silence",
    eyebrow: "Silencio",
    heading: "Un momento contigo",
    hint: "Quédate con lo que el Señor ha puesto en tu corazón.",
  });

  // 11 · Reflexión personal
  steps.push({
    id: "personal",
    kind: "personal",
    eyebrow: "Tu respuesta",
    heading: "¿Cómo llevarás esta palabra a tu vida hoy?",
    hint: "Escribe una intención concreta o guárdala en silencio.",
  });

  // 12 · Oración final
  steps.push({
    id: "final",
    kind: "final",
    eyebrow: "Oración final",
    heading: "Con la bendición del Padre",
    body:
      "Señor, que este día sea un reflejo de tu amor. Guíanos en cada paso y que todas nuestras acciones sean para tu gloria. Amén.",
    cta: "Terminar mi jornada",
  });

  return steps;
}
