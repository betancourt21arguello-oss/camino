export interface DailyPrayerStep {
  id: string;
  title: string;
  role?: "guía" | "todos";
  text: string;
  response?: string;
}

export const laudesSteps: DailyPrayerStep[] = [
  {
    id: "opening",
    title: "Invocación inicial",
    role: "guía",
    text: "Señor, abre mis labios.",
    response: "Y mi boca proclamará tu alabanza.",
  },
  {
    id: "invitatory",
    title: "Invitatorio",
    role: "todos",
    text: "Venid, adoremos a Cristo, Pastor supremo.",
    response: "Aclamemos al Señor con alegría; entremos en su presencia dándole gracias.",
  },
  {
    id: "hymn",
    title: "Himno de la mañana",
    role: "todos",
    text: "Buenos días, Señor, a ti el primero encuentra la mirada del corazón, apenas nace el día.",
  },
  {
    id: "psalm-1",
    title: "Salmo 62",
    role: "todos",
    text: "Oh Dios, tú eres mi Dios, por ti madrugo; mi alma está sedienta de ti, mi carne tiene ansia de ti.",
    response: "Toda mi vida te bendeciré y alzaré las manos invocándote.",
  },
  {
    id: "canticle",
    title: "Cántico",
    role: "todos",
    text: "Criaturas todas del Señor, bendecid al Señor, ensalzadlo con himnos por los siglos.",
  },
  {
    id: "reading",
    title: "Lectura breve",
    role: "guía",
    text: "Dios es fiel, y él os mantendrá firmes hasta el final, para que seáis irreprensibles en el día de nuestro Señor Jesucristo.",
  },
  {
    id: "benedictus",
    title: "Benedictus",
    role: "todos",
    text: "Bendito sea el Señor, Dios de Israel, porque ha visitado y redimido a su pueblo.",
  },
  {
    id: "intercessions",
    title: "Preces",
    role: "todos",
    text: "Cristo, sol que nace de lo alto, ilumina nuestros pasos y haz fecundo este día.",
    response: "Escúchanos, Señor.",
  },
  {
    id: "our-father",
    title: "Padre Nuestro",
    role: "todos",
    text: "Padre nuestro, que estás en el cielo, santificado sea tu Nombre…",
  },
  {
    id: "ending",
    title: "Oración final",
    role: "guía",
    text: "Señor, dirige hoy nuestras acciones y ayúdanos a realizarlas según tu voluntad. Por Jesucristo, nuestro Señor. Amén.",
  },
];

export const angelusSteps: DailyPrayerStep[] = [
  {
    id: "annunciation",
    title: "El anuncio",
    role: "guía",
    text: "El Ángel del Señor anunció a María.",
    response: "Y concibió por obra del Espíritu Santo.",
  },
  {
    id: "first-ave",
    title: "Ave María",
    role: "todos",
    text: "Dios te salve, María, llena eres de gracia; el Señor es contigo…",
  },
  {
    id: "fiat",
    title: "El sí de María",
    role: "guía",
    text: "He aquí la esclava del Señor.",
    response: "Hágase en mí según tu palabra.",
  },
  {
    id: "second-ave",
    title: "Ave María",
    role: "todos",
    text: "Dios te salve, María, llena eres de gracia; el Señor es contigo…",
  },
  {
    id: "incarnation",
    title: "La Encarnación",
    role: "guía",
    text: "Y el Verbo se hizo carne.",
    response: "Y habitó entre nosotros.",
  },
  {
    id: "third-ave",
    title: "Ave María",
    role: "todos",
    text: "Dios te salve, María, llena eres de gracia; el Señor es contigo…",
  },
  {
    id: "closing",
    title: "Oración final",
    role: "todos",
    text: "Derrama, Señor, tu gracia sobre nosotros, que por el anuncio del Ángel hemos conocido la Encarnación de tu Hijo, para que lleguemos por su Pasión y su Cruz a la gloria de la Resurrección. Amén.",
  },
];
