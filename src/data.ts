export type Participant = {
  id: number;
  name: string;
  status?: string;
  active: boolean;
  hue: number;
};

// Deterministic pseudo-avatar generator (gradient portrait initials)
const NAMES = [
  "María",
  "Juan",
  "Carlos",
  "María",
  "CarloJ",
  "Juan",
  "Carlos",
  "MaríaP",
  "Juan",
  "Pedro",
  "Ana",
  "Lucía",
  "José",
  "Rosa",
  "Marta",
  "Miguel",
  "Elena",
  "Diego",
  "Sofía",
  "Pablo",
];

export const ringParticipants: Participant[] = [
  { id: 1, name: "María", status: "", active: true, hue: 12 },
  { id: 2, name: "Juan", status: "Status", active: false, hue: 210 },
  { id: 3, name: "María", status: "Status", active: false, hue: 340 },
  { id: 4, name: "Juan", status: "Status", active: false, hue: 190 },
  { id: 5, name: "Carlos", status: "Status", active: true, hue: 30 },
  { id: 6, name: "MaríaP", status: "Status", active: true, hue: 300 },
  { id: 7, name: "Carlos", status: "", active: true, hue: 45 },
  { id: 8, name: "Juan", status: "Status", active: false, hue: 160 },
  { id: 9, name: "CarloJ", status: "Status", active: true, hue: 20 },
];

export function makeAvatars(count: number): Participant[] {
  const out: Participant[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      id: 1000 + i,
      name: NAMES[i % NAMES.length],
      active: (i * 7) % 3 !== 0,
      hue: (i * 47) % 360,
    });
  }
  return out;
}

export const mysteries = [
  "La Oración en el Huerto",
  "La Flagelación del Señor",
  "La Coronación de Espinas",
  "Jesús con la Cruz a cuestas",
  "La Crucifixión y Muerte de Jesús",
];

export const jaculatoria =
  "¡Oh Jesús mío, perdónanos nuestros pecados!... líbranos del fuego del infierno, lleva al cielo a todas las almas.";

export const communityIntentions = [
  { id: 1, tint: "#e9dcc4" },
  { id: 2, tint: "#d9c3c3" },
  { id: 3, tint: "#c4d0d9" },
  { id: 4, tint: "#c9d9c4" },
  { id: 5, tint: "#e9dcc4" },
  { id: 6, tint: "#d0c4d9" },
  { id: 7, tint: "#e9dcc4" },
  { id: 8, tint: "#c4d0d9" },
  { id: 9, tint: "#d9c3c3" },
  { id: 10, tint: "#e9dcc4" },
  { id: 11, tint: "#c9d9c4" },
  { id: 12, tint: "#e9dcc4" },
  { id: 13, tint: "#e9dcc4" },
  { id: 14, tint: "#c4d0d9" },
];
