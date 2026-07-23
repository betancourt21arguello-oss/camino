// ============================================================
//  REGLA DE VIDA  (gestor de compromisos espirituales)
//  Tabla en Supabase: spiritual_tasks
//  Vinculada al sistema de Frutos (semillas al completar).
// ============================================================

export type TaskCadence = "daily" | "weekly";
export type TaskCategory =
  | "laudes"
  | "angelus"
  | "rosary"
  | "gospel"
  | "psalm"
  | "first_reading"
  | "second_reading"
  | "mass"
  | "examen"
  | "confession"
  | "custom"
  | "vespers";

export interface SpiritualTask {
  id: string;
  title: string;
  category: TaskCategory;
  cadence: TaskCadence;
  /** Hora sugerida "HH:MM" para tareas ancladas (Laudes, Ángelus...). */
  time?: string;
  /** Compromiso obligatorio del laico (no se puede borrar). */
  required?: boolean;
  done: boolean;
  icon: string;
}

// Compromisos que TODO laico debe rezar — siempre presentes a su hora,
// para rezarlos en comunidad. Mínimo: 1 Rosario al día.
/** Plantilla para la RPC ensure_daily_spiritual_tasks; no es estado local. */
export const defaultTasks: SpiritualTask[] = [
  {
    id: "laudes",
    title: "Laudes (oración de la mañana)",
    category: "laudes",
    cadence: "daily",
    time: "07:00",
    required: true,
    done: false,
    icon: "☀️",
  },
  {
    id: "angelus-am",
    title: "Ángelus",
    category: "angelus",
    cadence: "daily",
    time: "12:00",
    required: true,
    done: false,
    icon: "🕊️",
  },
  {
    id: "gospel",
    title: "Leer el Evangelio del día",
    category: "gospel",
    cadence: "daily",
    time: "13:00",
    required: false,
    done: false,
    icon: "📖",
  },
  {
    id: "psalm",
    title: "Leer el Salmo del día",
    category: "psalm",
    cadence: "daily",
    time: "13:05",
    done: false,
    icon: "🎵",
  },
  {
    id: "first-reading",
    title: "Primera lectura",
    category: "first_reading",
    cadence: "daily",
    time: "13:10",
    done: false,
    icon: "📜",
  },
  {
    id: "second-reading",
    title: "Segunda lectura",
    category: "second_reading",
    cadence: "daily",
    time: "13:15",
    done: false,
    icon: "📜",
  },
  {
    id: "rosary",
    title: "Rezar el Santo Rosario",
    category: "rosary",
    cadence: "daily",
    time: "20:00",
    required: true,
    done: false,
    icon: "📿",
  },
  {
    id: "mass",
    title: "Ir a Misa",
    category: "mass",
    cadence: "daily",
    time: "10:00",
    required: true,
    done: false,
    icon: "⛪",
  },
  {
    id: "vespers",
    title: "Vísperas (oración de la tarde)",
    category: "vespers",
    cadence: "daily",
    time: "19:00",
    required: false,
    done: false,
    icon: "🌇",
  },
  {
    id: "examen",
    title: "Examen de conciencia",
    category: "examen",
    cadence: "daily",
    time: "21:00",
    done: false,
    icon: "🕯️",
  },
  {
    id: "confession",
    title: "Confesión mensual",
    category: "confession",
    cadence: "weekly",
    required: false,
    done: false,
    icon: "🙏",
  },
];
