// ============================================================
//  REGLA DE VIDA  (gestor de compromisos espirituales)
//  Tabla en Supabase: spiritual_tasks
// ============================================================

export type TaskCadence = "daily" | "weekly" | "monthly" | "once";
export type TaskCategory =
  | "ofrecimiento"
  | "laudes"
  | "angelus"
  | "rosary"
  | "gospel"
  | "psalm"
  | "first_reading"
  | "second_reading"
  | "silence"
  | "mass"
  | "examen"
  | "fasting"
  | "confession"
  | "custom"
  | "vespers";

export interface SpiritualTask {
  id: string;
  title: string;
  category: TaskCategory;
  cadence: TaskCadence;
  time?: string;
  required?: boolean;
  done: boolean;
  icon: string;
  /** Días de la semana: 0=dom..6=sáb. Sin definir = todos los días. */
  days?: number[];
  /** Fecha ISO (YYYY-MM-DD) para la que está programada la tarea. */
  task_date?: string;
}

// ============================================================
//  Plantilla para ensure_daily_spiritual_tasks
//  La RPC en Supabase decidirá qué insertar según el día,
//  isSunday e isSolemnity. El frontend usa esto como fallback.
// ============================================================
export const defaultTasks: SpiritualTask[] = [
  // DIARIAS — todo laico
  {
    id: "ofrecimiento",
    title: "Ofrecimiento matutino",
    category: "ofrecimiento",
    cadence: "daily",
    time: "06:30",
    required: true,
    done: false,
    icon: "🌅",
  },
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
    id: "gospel",
    title: "Lectura del Evangelio del día",
    category: "gospel",
    cadence: "daily",
    time: "08:00",
    required: true,
    done: false,
    icon: "📖",
  },
  {
    id: "psalm",
    title: "Salmo del día",
    category: "psalm",
    cadence: "daily",
    time: "08:10",
    required: true,
    done: false,
    icon: "🎵",
  },
  {
    id: "first-reading",
    title: "Primera lectura",
    category: "first_reading",
    cadence: "daily",
    time: "08:20",
    required: true,
    done: false,
    icon: "📜",
  },
  {
    id: "second-reading",
    title: "Segunda lectura",
    category: "second_reading",
    cadence: "daily",
    time: "08:30",
    required: true,
    done: false,
    icon: "📜",
  },
  {
    id: "silence",
    title: "Oración mental o silencio",
    category: "silence",
    cadence: "daily",
    time: "09:00",
    required: true,
    done: false,
    icon: "🤫",
  },
  {
    id: "angelus",
    title: "Ángelus",
    category: "angelus",
    cadence: "daily",
    time: "12:00",
    required: true,
    done: false,
    icon: "🕊️",
  },
  {
    id: "rosary",
    title: "Santo Rosario",
    category: "rosary",
    cadence: "daily",
    time: "20:00",
    required: true,
    done: false,
    icon: "📿",
  },
  {
    id: "examen",
    title: "Examen de conciencia",
    category: "examen",
    cadence: "daily",
    time: "21:00",
    required: true,
    done: false,
    icon: "🕯️",
  },

  // SEMANAL — Domingos
  {
    id: "mass-sunday",
    title: "Santa Misa dominical",
    category: "mass",
    cadence: "weekly",
    time: "10:00",
    required: true,
    done: false,
    icon: "⛪",
    days: [0], // domingo
  },

  // SEMANAL — Miércoles y Viernes
  {
    id: "fasting",
    title: "Ayuno de hábito o de alimento",
    category: "fasting",
    cadence: "weekly",
    time: "06:00",
    required: true,
    done: false,
    icon: "🍞",
    days: [3, 5], // miércoles, viernes
  },

  // MENSUAL
  {
    id: "confession",
    title: "Confesión o guía espiritual",
    category: "confession",
    cadence: "monthly",
    required: true,
    done: false,
    icon: "🙏",
  },
];
