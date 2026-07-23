import type { DailyLiturgy, LiturgicalEvent } from "./types";

// Datos de ejemplo con la MISMA forma que devuelve Gemini (1 llamada/día).
// En producción esto llega de /api/daily (Cloudflare Worker + KV cache).
export const todayLiturgy: DailyLiturgy = {
  date: "2026-07-21",
  weekday: "Martes",
  season: "Tiempo Ordinario",
  liturgicalColor: "#7a8a5c",
  saint: {
    name: "San Lorenzo de Brindis",
    title: "Presbítero y Doctor de la Iglesia",
    initial: "L",
  },
  quote: {
    text:
      "Que brille así vuestra luz delante de los hombres, para que vean vuestras buenas obras.",
    ref: "Mateo 5, 16",
  },
  gospel: {
    ref: "Mateo 12, 46-50",
    title: "Evangelio de hoy",
    body:
      "Todavía estaba hablando Jesús a la gente, cuando su madre y sus hermanos se presentaron fuera y trataban de hablar con él. Uno le dijo: «Mira, tu madre y tus hermanos están fuera y quieren hablar contigo.» Pero él contestó: «¿Quién es mi madre y quiénes son mis hermanos?» Y, extendiendo su mano hacia sus discípulos, dijo: «Estos son mi madre y mis hermanos. El que haga la voluntad de mi Padre del cielo, ese es mi hermano, y mi hermana, y mi madre.»",
  },
  psalm: {
    ref: "Salmo 84 (85)",
    title: "Salmo del día",
    body:
      "R. Muéstranos, Señor, tu misericordia.\n\nSeñor, has sido bueno con tu tierra, has restaurado la suerte de Jacob, has perdonado la culpa de tu pueblo, has sepultado todos sus pecados.\n\nR. Muéstranos, Señor, tu misericordia.\n\n¿No volverás a darnos la vida, para que tu pueblo se alegre contigo? Muéstranos, Señor, tu misericordia y danos tu salvación.",
  },
  firstReading: {
    ref: "Miqueas 7, 14-15. 18-20",
    title: "Primera lectura",
    body:
      "Apacienta a tu pueblo con tu cayado, al rebaño de tu heredad. ¿Qué Dios hay como tú, que perdonas la maldad y olvidas el pecado? Volverá a compadecerse de nosotros y arrojará al fondo del mar todos nuestros pecados.",
  },
  laudes: {
    title: "Laudes",
    body:
      "Señor, abre mis labios, y mi boca proclamará tu alabanza. Bendito seas, Señor, Dios de Israel, porque has visitado y redimido a tu pueblo. Gloria al Padre, y al Hijo, y al Espíritu Santo.",
  },
  reflection:
    "Jesús redefine la familia en torno a la voluntad del Padre. Hoy la Iglesia te invita a pertenecer a esa casa: no por la sangre, sino por la escucha y la obediencia amorosa. ¿Dónde te pide el Padre hacer su voluntad hoy?",
  imagePrompt:
    "Serene sacred art, Jesus teaching a crowd, warm golden light, soft renaissance style",
  imageUrl: "/images/daily.jpg",
  marian: {
    source: "Medjugorje",
    text:
      "Queridos hijos, hoy os invito a la oración con el corazón. Que la oración sea para vosotros alegría.",
    relevant: true,
  },
};

// Días del mes con su estado litúrgico (para la tira del calendario).
export const monthEvents: LiturgicalEvent[] = [
  { date: "2026-07-16", day: 16, label: "Ntra. Sra. del Carmen", rank: "memoria" },
  { date: "2026-07-17", day: 17, label: "Feria", rank: "feria" },
  { date: "2026-07-18", day: 18, label: "Feria", rank: "feria" },
  { date: "2026-07-19", day: 19, label: "Domingo XVI", rank: "fiesta" },
  { date: "2026-07-20", day: 20, label: "San Apolinar", rank: "memoria" },
  { date: "2026-07-21", day: 21, label: "San Lorenzo de Brindis", rank: "memoria" },
  { date: "2026-07-22", day: 22, label: "Sta. María Magdalena", rank: "fiesta" },
  { date: "2026-07-23", day: 23, label: "Sta. Brígida", rank: "fiesta" },
  { date: "2026-07-24", day: 24, label: "San Charbel", rank: "memoria" },
  { date: "2026-07-25", day: 25, label: "Santiago Apóstol", rank: "fiesta" },
  { date: "2026-07-26", day: 26, label: "Ss. Joaquín y Ana", rank: "memoria" },
  { date: "2026-07-27", day: 27, label: "Feria", rank: "feria" },
];

export const TODAY_DAY = 21;

/** Progreso ficticio de días pasados (para ver logros previos). */
export const pastProgress: Record<number, { rosaries: number; done: boolean }> = {
  16: { rosaries: 1, done: true },
  17: { rosaries: 1, done: true },
  18: { rosaries: 0, done: false },
  19: { rosaries: 2, done: true },
  20: { rosaries: 1, done: true },
};
