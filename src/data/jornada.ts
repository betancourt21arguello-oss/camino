export type JornadaStep = {
  id: number;
  kind:
    | "greeting"
    | "breath"
    | "prayer"
    | "quote"
    | "reading"
    | "silence"
    | "reflect"
    | "final";
  title?: string;
  body: string;
  sub?: string;
  citation?: string;
  cta?: string;
};

export const jornadaSteps: JornadaStep[] = [
  {
    id: 1,
    kind: "greeting",
    title: "Paso 1:",
    body: "Dios te bendiga.\nHoy caminas con San\nAntonio de Padua.",
    cta: "Comenzar en paz",
  },
  {
    id: 2,
    kind: "breath",
    body: "Toma tres respiraciones lentas.",
    sub: "Pon este día en las manos de Dios.",
  },
  {
    id: 3,
    kind: "prayer",
    title: "Paso 3:",
    body:
      "Invocación al Espíritu Santo:\n\nVen, Espíritu Santo, ven por medio de la poderosa intercesión del Inmaculado Corazón de María, tu amadísima Esposa. *x3*",
  },
  {
    id: 4,
    kind: "prayer",
    title: "Paso 4:",
    body:
      "Oración al Espíritu Santo:\n\nOh Espíritu Santo, Amor del Padre y del Hijo, inspírame siempre lo que debo pensar, lo que debo decir, cómo debo decirlo, lo que debo callar, cómo debo actuar y lo que debo hacer, para gloria de Dios, bien de las almas y mi propia santificación. Espíritu Santo, dame agudeza para entender, capacidad para retener, método y facultad para aprender, sutileza para interpretar, gracia y eficacia para hablar. Dame acierto al empezar, dirección al progresar y perfección al acabar. Amén.",
  },
  {
    id: 5,
    kind: "quote",
    title: "Paso 5:",
    body: "Una frase para hoy",
    sub:
      "“Que brille así vuestra luz delante de los hombres, para que vean vuestras buenas obras y glorifiquen a vuestro Padre que está en los cielos.”",
    citation: "Mateo 5, 16",
  },
  {
    id: 6,
    kind: "reading",
    title: "Paso 6:",
    body: "Primera lectura",
    sub:
      "Apacienta a tu pueblo con tu cayado, al rebaño de tu heredad, que vive solo en la espesura, en medio del Carmelo. Que pasten en Basán y Galaad como en los días de antaño.\n\nComo en los días en que saliste de Egipto, le mostraré maravillas.\n\n¿Qué Dios hay como tú, que perdonas la maldad y olvidas el pecado del resto de tu heredad? No mantendrá por siempre su ira, pues se complace en la misericordia.\n\nVolverá a compadecerse de nosotros, aplastará nuestras iniquidades y arrojará al fondo del mar todos nuestros pecados.\n\nMostrarás a Jacob tu fidelidad, a Abraham tu misericordia, como juraste a nuestros padres desde tiempos antiguos.",
    citation: "Miqueas 7, 14-15. 18-20",
  },
  {
    id: 7,
    kind: "reading",
    title: "Paso 7:",
    body: "Salmo del día",
    sub:
      "R. Muéstranos, Señor, tu misericordia.\n\nSeñor, has sido bueno con tu tierra,\nhas restaurado la suerte de Jacob,\nhas perdonado la culpa de tu pueblo,\nhas sepultado todos sus pecados,\nhas reprimido tu cólera,\nhas desistido del furor de tu ira.\n\nR. Muéstranos, Señor, tu misericordia.\n\nRestáuranos, Dios salvador nuestro;\cesa en tu enojo contra nosotros.\n¿Vas a estar siempre enojado con nosotros?\n¿Vas a prolongar tu ira de edad en edad?\n\nR. Muéstranos, Señor, tu misericordia.\n\n¿No volverás a darnos la vida,\npara que tu pueblo se alegre contigo?\nMuéstranos, Señor, tu misericordia\ny danos tu salvación.\n\nR. Muéstranos, Señor, tu misericordia.",
    citation: "Salmo 84 (85), 2-4. 5-6. 7-8",
  },
  {
    id: 8,
    kind: "reading",
    title: "Paso 8:",
    body: "Segunda lectura",
    sub:
      "En las ferias del Tiempo Ordinario no hay segunda lectura en la Misa.\n\nQuédate un instante con la Palabra ya escuchada. Deja que el Señor vuelva a ti con misericordia y arroje al fondo del mar todo lo que te pesa.\n\nAclamación:\n«El que me ama guardará mi palabra —dice el Señor—, y mi Padre lo amará, y vendremos a él.»",
    citation: "Juan 14, 23",
  },
  {
    id: 9,
    kind: "reading",
    title: "Paso 9:",
    body: "Evangelio de hoy",
    sub:
      "Todavía estaba hablando Jesús a la gente, cuando su madre y sus hermanos se presentaron fuera y trataban de hablar con él.\n\nUno le dijo: «Mira, tu madre y tus hermanos están fuera y quieren hablar contigo.»\n\nPero él contestó al que se lo decía: «¿Quién es mi madre y quiénes son mis hermanos?»\n\nY, extendiendo su mano hacia sus discípulos, dijo: «Estos son mi madre y mis hermanos. El que haga la voluntad de mi Padre del cielo, ese es mi hermano, y mi hermana, y mi madre.»",
    citation: "Mateo 12, 46-50",
  },
  {
    id: 10,
    kind: "reading",
    title: "Paso 10:",
    body: "Guía de la Iglesia",
    sub:
      "Jesús redefine la familia en torno a la voluntad del Padre. Hoy la Iglesia te invita a pertenecer a esa casa: no por la sangre, sino por la escucha y la obediencia amorosa.\n\nSan Antonio de Padua — predicador de la Palabra — nos recuerda que la mejor homilía es una vida que ilumina. Que tu día sea un “sí” concreto a lo que Dios te pide: un perdón, una ayuda, una palabra amable, un silencio fiel.\n\nPregunta para llevar:\n¿Dónde me pide el Padre hacer su voluntad hoy?",
  },
  {
    id: 11,
    kind: "silence",
    title: "Paso 11:",
    body: "Un momento de silencio.",
    sub: "Quédate con lo que el Señor ha puesto en tu corazón.",
  },
  {
    id: 12,
    kind: "reflect",
    title: "Paso 12:",
    body: "¿Cómo dio luz tu vida\na alguien hoy?",
    sub: "Escribe o guarda en silencio una intención concreta.",
  },
  {
    id: 13,
    kind: "final",
    title: "Paso 13",
    body: "Oración final temática:",
    sub:
      "Señor, que este día sea un reflejo de tu amor. Guíanos en cada paso y que todas nuestras acciones sean para tu gloria. Amén.",
    cta: "Terminar mi jornada",
  },
];
