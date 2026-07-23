// ============================================================
//  MOTOR DE LITURGIAS MODULAR — Type System
//  The engine never "knows" the Rosario. It only interprets a
//  Devotion (JSON-serializable). To add Coronillas / Novenas you
//  only add a new Devotion object — never touch the engine.
// ============================================================

export type StepType =
  | "sign" // Señal de la cruz
  | "creed" // Credo
  | "prayer" // Oración simple (Padrenuestro, etc.)
  | "repeat-prayer" // Oración repetida (Ave María x10)
  | "doxology" // Gloria
  | "invocation" // Jaculatoria (Oh Jesús mío)
  | "mystery-announce" // Anuncio + meditación del misterio
  | "reflection" // Interludio contemplativo (chat + música)
  | "ending"; // Oración final

/** Cada oración tiene dos posibles roles. El sistema los asigna. */
export type Role = "leader" | "assembly" | "all";

export type Mode = "community" | "solo";

/**
 * Condiciones bajo las que un Step puede terminar. La máquina de
 * estados decide, NUNCA el botón.
 *  - "time"      → se alcanzó la duración esperada
 *  - "consensus" → más del 70% marcó "he terminado"
 *  - "leader"    → el guía terminó y pasó un pequeño tiempo de gracia
 *  - "gesture"   → (solo) el usuario marcó su parte terminada
 */
export type TransitionCondition = "time" | "consensus" | "leader" | "gesture";

export interface Step {
  id: string;
  type: StepType;
  title: string;
  /** Texto genérico (si no hay reparto de roles). */
  text?: string;
  /** Parte del GUÍA. */
  leaderText?: string;
  /** Parte de la ASAMBLEA. */
  assemblyText?: string;
  /** Nº de iteraciones. La máquina lleva el repeatIndex como estado. */
  repeat?: number;
  /** Duración esperada por iteración (segundos). */
  duration: number;
  role: Role;
  /** Qué transiciones pueden hacer avanzar este Step. */
  transitions: TransitionCondition[];
  reflection?: boolean;
  chat?: boolean;
  music?: string;
  image?: string;
  svgEffect?: string;
}

export type SectionKind = "intro" | "mystery" | "conclusion";

export interface Section {
  id: string;
  title: string;
  kind: SectionKind;
  steps: Step[];
}

export interface Devotion {
  id: string;
  title: string;
  subtitle: string;
  sections: Section[];
}

/** Un Step aplanado, con su contexto de sección para la UI. */
export interface FlatStep {
  step: Step;
  sectionIndex: number;
  sectionTitle: string;
  sectionKind: SectionKind;
  mysteryNumber?: number;
}

export interface EngineState {
  status: "idle" | "running" | "paused" | "completed";
  mode: Mode;
  flatIndex: number;
  repeatIndex: number;
  stepElapsed: number;
  phase: "prayer" | "reflection";
  participants: number; // count
  completedRatio: number; // 0..1 for current step
  leaderIsMe: boolean;
  soloDone: boolean;
}
