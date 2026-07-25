import type { BibleUserLevel, BibleGoalTag, BiblePlanLevel } from '@/types/bible';

export type UserBibleAnswers = {
  level: BibleUserLevel;
  minutes_per_day: number;
  preferred_time?: string;
  goal: BibleGoalTag;
  topic?: string;
};

export type RecommendResult = {
  plan_slug: string;
  method_slug: string;
  level: BiblePlanLevel;
  minutes_per_day: number;
  reason: string;
};

const PLANS_30 = '30-conoce-a-jesus';
const PLANS_60 = '60-nuevo-testamento';
const PLANS_90 = '90-panoramica-biblia';
const PLANS_LECTIONARY = '365-leccionario';
const PLANS_TOPIC_14 = '14-tematico';

export function recommendPlan(a: UserBibleAnswers): RecommendResult {
  if (a.goal === 'seguir_la_misa') {
    return {
      plan_slug: PLANS_LECTIONARY,
      method_slug: 'lectura-leccionario',
      level: 'intermedio',
      minutes_per_day: Math.max(10, a.minutes_per_day),
      reason: 'Como quieres seguir la Misa, el leccionario te mantiene unido a la liturgia diaria de la Iglesia.',
    };
  }

  if (a.goal === 'un_tema_concreto' && a.topic) {
    return {
      plan_slug: PLANS_TOPIC_14,
      method_slug: 'lectio-divina-simplificada',
      level: 'principiante',
      minutes_per_day: Math.min(a.minutes_per_day, 15),
      reason: `Exploraremos el tema "${a.topic}" en 14 días con Lectio Divina simplificada.`,
    };
  }

  if (a.level === 'nunca_lei' || a.level === 'algo_suelto') {
    return {
      plan_slug: PLANS_30,
      method_slug: 'lectio-divina-simplificada',
      level: 'principiante',
      minutes_per_day: Math.min(a.minutes_per_day, 10),
      reason: 'Como es tu primera vez, empezamos por lo esencial: conocer a Jesús en 30 días con Lectio Divina simplificada.',
    };
  }

  if (a.level === 'leo_a_veces' && a.minutes_per_day >= 15) {
    return {
      plan_slug: PLANS_60,
      method_slug: 'lectio-divina-simplificada',
      level: 'intermedio',
      minutes_per_day: a.minutes_per_day,
      reason: 'Ya tienes algo de práctica. Te proponemos el Nuevo Testamento en 60 días para profundizar.',
    };
  }

  if (a.level === 'constante') {
    return {
      plan_slug: PLANS_90,
      method_slug: 'lectio-divina-simplificada',
      level: 'avanzado',
      minutes_per_day: a.minutes_per_day,
      reason: 'Por tu constancia, te animamos a una visión panorámica de la Biblia en 90 días.',
    };
  }

  return {
    plan_slug: PLANS_30,
    method_slug: 'lectio-divina-simplificada',
    level: 'principiante',
    minutes_per_day: Math.min(a.minutes_per_day, 10),
    reason: 'Empezamos por un plan suave de 30 días para que te acerques a Jesús sin prisas.',
  };
}
