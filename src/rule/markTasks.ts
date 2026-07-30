import { supabase } from "../lib/supabase";
import type { TaskCategory } from "./tasks";
import { caracasDate } from "../utils/caracas";

const todayIso = () => caracasDate();

/**
 * Marca como completadas todas las tareas del día cuyas categorías estén en
 * `categories`. Pensado para sincronizar la Regla de Vida cuando el usuario
 * reza una Hora o completa la Jornada: el Realtime propaga el cambio a la
 * pestaña Regla sin recargar.
 */
export async function markCategoriesDone(
  userId: string | null | undefined,
  categories: TaskCategory[],
): Promise<boolean> {
  if (!supabase || !userId || categories.length === 0) return false;
  const { error } = await supabase
    .from("spiritual_tasks")
    .update({ done: true, completed_at: new Date().toISOString() })
    .eq("profile_id", userId)
    .eq("task_date", todayIso())
    .in("category", categories);
  return !error;
}

/** Target del lector / portal → categorías de la Regla de Vida que salda. */
export function categoriesForTarget(
  target:
    | "gospel"
    | "psalm"
    | "first"
    | "second"
    | "laudes"
    | "angelus"
    | "vespers"
    | "compline"
    | "catechism"
    | "onthistoday",
): TaskCategory[] {
  switch (target) {
    case "gospel":
      return ["gospel"];
    case "psalm":
      return ["psalm"];
    case "first":
      return ["first_reading"];
    case "second":
      return ["second_reading"];
    case "laudes":
      return ["laudes"];
    case "angelus":
      return ["angelus"];
    case "vespers":
      return ["vespers"];
    case "compline":
    case "catechism":
    case "onthistoday":
      return []; // no saldan tarea obligatoria diaria
  }
}

/** Categorías que salda completar "Comenzar mi jornada" de un tirón. */
export const JORNADA_CATEGORIES: TaskCategory[] = [
  "ofrecimiento",
  "gospel",
  "psalm",
  "first_reading",
  "second_reading",
  "silence",
];
