import type { Step } from "../types";

export const señal = (id = "senal"): Step => ({
  id,
  type: "sign",
  title: "Señal de la Cruz",
  role: "leader",
  duration: 6,
  transitions: ["time", "gesture", "leader"],
  leaderText: "Por la señal de la Santa Cruz, de nuestros enemigos líbranos, Señor, Dios nuestro.",
  assemblyText: "En el nombre del Padre, y del Hijo, y del Espíritu Santo. Amén.",
});

export const señalCorta = (id = "senal"): Step => ({
  id,
  type: "sign",
  title: "Señal de la Cruz",
  role: "leader",
  duration: 6,
  transitions: ["time", "gesture", "leader"],
  leaderText: "Que la bendición de Dios todopoderoso, Padre, Hijo y Espíritu Santo,",
  assemblyText: "descienda sobre nosotros y permanezca para siempre. Amén. (Hacer la Señal de la Cruz)",
});

export const credo = (id = "credo"): Step => ({
  id,
  type: "creed",
  title: "Credo de los Apóstoles",
  role: "leader",
  duration: 10,
  transitions: ["time", "gesture", "leader"],
  leaderText:
    "Creo en Dios, Padre todopoderoso, Creador del cielo y de la tierra. Creo en Jesucristo, su único Hijo, nuestro Señor, que fue concebido por obra y gracia del Espíritu Santo, nació de Santa María Virgen, padeció bajo el poder de Poncio Pilato, fue crucificado, muerto y sepultado, descendió a los infiernos, al tercer día resucitó de entre los muertos, subió a los cielos y está sentado a la derecha de Dios, Padre todopoderoso. Desde allí ha de venir a juzgar a vivos y muertos.",
  assemblyText:
    "Creo en el Espíritu Santo, la santa Iglesia católica, la comunión de los santos, el perdón de los pecados, la resurrección de la carne y la vida eterna. Amén.",
});

export const padreNuestro = (n: number | string): Step => ({
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

export const aveMaria = (id: string, repeat: number = 1): Step => ({
  id,
  type: "repeat-prayer",
  title: "Ave María",
  role: "leader",
  duration: 6,
  repeat,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText:
    "Dios te salve, María, llena eres de gracia; el Señor es contigo. Bendita Tú eres entre todas las mujeres, y bendito es el fruto de tu vientre, Jesús.",
  assemblyText:
    "Santa María, Madre de Dios, ruega por nosotros, pecadores, ahora y en la hora de nuestra muerte. Amén.",
});

export const gloria = (n: number | string): Step => ({
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

export const actoDeContricion = (id = "contricion"): Step => ({
  id,
  type: "prayer",
  title: "Acto de Contrición",
  role: "leader",
  duration: 10,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText:
    "Señor mío Jesucristo, Dios y Hombre verdadero, Creador, Padre y Redentor mío; por ser vos quien sois, bondad infinita, y porque os amo sobre todas las cosas, me pesa de todo corazón haberos ofendido; también me pesa porque podéis castigarme con las penas del infierno.",
  assemblyText:
    "Ayudado de vuestra divina gracia, propongo firmemente nunca más pecar, confesarme y cumplir la penitencia que me fuere impuesta. Amén.",
});

export const salveRegina = (id = "salve"): Step => ({
  id,
  type: "prayer",
  title: "Salve Regina",
  role: "leader",
  duration: 10,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText: "Dios te salve, Reina y Madre de misericordia...",
  assemblyText:
    "...oh clemente, oh piadosa, oh dulce siempre Virgen María. Ruega por nosotros, Santa Madre de Dios.",
});

export const jaculatoriaFatima = (n: number | string): Step => ({
  id: `fatima-${n}`,
  type: "invocation",
  title: "Jaculatoria de Fátima",
  role: "leader",
  duration: 6,
  transitions: ["time", "consensus", "leader", "gesture"],
  leaderText:
    "Oh Jesús mío, perdona nuestros pecados, líbranos del fuego del infierno, lleva al cielo a todas las almas, especialmente a las más necesitadas de tu misericordia.",
  assemblyText: "Amén.",
});
