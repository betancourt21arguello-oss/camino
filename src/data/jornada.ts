import type { DailyLiturgy } from "../liturgy/types";

export type JornadaStepKind =
  | "offering"
  | "greeting"
  | "breath"
  | "invocation"
  | "quote"
  | "reading"
  | "threecrosses"
  | "gospel"
  | "catechism"
  | "onthistoday"
  | "reflection"
  | "silence"
  | "personal"
  | "final";

export interface JornadaStep {
  id: string;
  kind: JornadaStepKind;
  eyebrow?: string;
  heading: string;
  citation?: string;
  body?: string;
  hint?: string;
  cta?: string;
  /** Evangelio: evangelista para la fórmula "según san X". */
  evangelist?: string;
  /** Evangelio: diálogo final. */
  response?: string;
  responseLabel?: string;
  /** Catecismo: número CEC. */
  number?: string;
  /** OnThisDay / catecismo: categoría o aplicación. */
  category?: string;
  applyToday?: string;
}

const OFFERING =
  "Señor mío Jesucristo, al comenzar este día te ofrezco todo lo que soy, lo que tengo, lo que pienso y lo que haré. Te ofrezco las alegrías y las cruces de esta jornada, unidas a tu Sacrificio en la Misa, por las intenciones de tu Corazón y por Venezuela, nuestra tierra, sus familias, sus enfermos y sus jóvenes. Haz que cada acto mío de hoy sea una semilla de tu Reino. Amén.";

function evangelistFrom(ref: string | undefined, explicit: string | undefined): string {
  if (explicit) return explicit;
  if (!ref) return "el Evangelio";
  const m = ref.match(/(Mateo|Marcos|Lucas|Juan)/i);
  return m ? `san ${m[1]}` : "el Evangelio";
}

export function buildJornadaSteps(liturgy: DailyLiturgy | null): JornadaStep[] {
  const L = liturgy;
  const saint = L?.saint?.name;
  const weekday = L?.weekday ?? "hoy";
  const steps: JornadaStep[] = [];

  steps.push({
    id: "offering",
    kind: "offering",
    eyebrow: `Ofrecimiento · ${weekday}`,
    heading: "Ofrecimiento matutino",
    body: OFFERING,
    hint: saint ? `Hoy caminas de la mano de ${saint}.` : "Pon el día en las manos de Dios.",
    cta: "Lo ofrezco de corazón",
  });

  steps.push({
    id: "breath",
    kind: "breath",
    eyebrow: "Preparar el corazón",
    heading: "Tres respiraciones lentas",
    hint: "Quieta el cuerpo. Deja que el Espíritu Santo tome el timón.",
  });

  steps.push({
    id: "invocation",
    kind: "invocation",
    eyebrow: "Invocación",
    heading: "Ven, Espíritu Santo",
    body:
      "Ven, Espíritu Santo, ven por medio de la poderosa intercesión del Inmaculado Corazón de María, tu amadísima Esposa.\n\nOh Espíritu Santo, Amor del Padre y del Hijo, inspírame lo que debo pensar, lo que debo decir y lo que debo callar; cómo actuar y cómo sufrir, para gloria de Dios, bien de las almas y mi propia santificación. Amén.",
  });

  if (L?.quote?.text) {
    steps.push({
      id: "quote",
      kind: "quote",
      eyebrow: "Una frase para hoy",
      heading: `"${L.quote.text}"`,
      citation: L.quote.ref,
    });
  }

  if (L?.firstReading?.body) {
    steps.push({
      id: "first-reading",
      kind: "reading",
      eyebrow: "Primera lectura",
      heading: L.firstReading.title || "Palabra de Dios",
      citation: L.firstReading.ref,
      body: L.firstReading.body,
      response: "Palabra de Dios",
      responseLabel: "Te alabamos, Señor",
    });
  }

  if (L?.psalm?.body) {
    steps.push({
      id: "psalm",
      kind: "reading",
      eyebrow: "Salmo responsorial",
      heading: L.psalm.title || "Salmo del día",
      citation: L.psalm.ref,
      body: L.psalm.body,
    });
  }

  if (L?.secondReading?.body) {
    steps.push({
      id: "second-reading",
      kind: "reading",
      eyebrow: "Segunda lectura",
      heading: L.secondReading.title || "Palabra de Dios",
      citation: L.secondReading.ref,
      body: L.secondReading.body,
      response: "Palabra de Dios",
      responseLabel: "Te alabamos, Señor",
    });
  }

  if (L?.gospel?.body) {
    const ev = evangelistFrom(L.gospel.ref, L.gospel.evangelist);
    steps.push({
      id: "threecrosses",
      kind: "threecrosses",
      eyebrow: "Antes del Evangelio",
      heading: "Tres pequeñas cruces",
      hint:
        "Traza con el pulgar una cruz en la frente, otra en los labios y otra en el pecho, mientras dices en silencio: que el Evangelio esté en mi mente, en mi palabra y en mi corazón.",
    });
    steps.push({
      id: "gospel",
      kind: "gospel",
      eyebrow: "Evangelio",
      heading: L.gospel.title || "Evangelio del día",
      citation: L.gospel.ref,
      evangelist: ev,
      body: L.gospel.body,
      response: L.gospel.closingResponse ?? "Gloria a ti, Señor Jesús",
      responseLabel: L.gospel.closingProclaim ?? "Palabra del Señor",
    });
  }

  if (L?.catechism?.text) {
    steps.push({
      id: "catechism",
      kind: "catechism",
      eyebrow: "Catecismo del día",
      heading: L.catechism.title || "Una lección de la fe",
      number: L.catechism.number,
      body: L.catechism.text,
      applyToday: L.catechism.applyToday,
    });
  }

  if (L?.reflection) {
    steps.push({
      id: "reflection",
      kind: "reflection",
      eyebrow: "Reflexión del día",
      heading: "Meditar con el corazón",
      body: L.reflection,
    });
  }

  if (L?.onThisDay?.text) {
    steps.push({
      id: "onthistoday",
      kind: "onthistoday",
      eyebrow: `Un día como hoy · ${L.onThisDay.category}`,
      heading: L.onThisDay.title,
      body: L.onThisDay.text,
      category: L.onThisDay.category,
      applyToday: L.onThisDay.venezuela,
    });
  }

  steps.push({
    id: "silence",
    kind: "silence",
    eyebrow: "Silencio",
    heading: "Un momento contigo",
    hint: "Deja reposar la Palabra. Escucha lo que Dios te susurra hoy.",
  });

  steps.push({
    id: "personal",
    kind: "personal",
    eyebrow: "Tu respuesta",
    heading: "¿Cómo llevarás esto a tu día?",
    hint: "Una intención concreta, una persona, un gesto. Escríbelo o guárdalo en silencio.",
  });

  steps.push({
    id: "final",
    kind: "final",
    eyebrow: "Oración final",
    heading: "Con la bendición del Padre",
    body:
      "Señor, que este día sea un reflejo de tu amor por Venezuela y por cada hogar. Guíanos paso a paso, y que todo lo que hagamos sea para tu mayor gloria. Amén.",
    cta: "Terminar mi jornada",
  });

  return steps;
}
