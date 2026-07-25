import { useState } from 'react';
import { recommendPlan } from '@/lib/bible/recommend';
import type { BibleGoalTag, BibleUserLevel } from '@/types/bible';

export type OnboardingData = {
  level: BibleUserLevel;
  minutes_per_day: number;
  preferred_time?: string;
  goal: BibleGoalTag;
  topic?: string;
};

export type RecommendResult = {
  plan_slug: string;
  method_slug: string;
  level: 'principiante' | 'intermedio' | 'avanzado';
  minutes_per_day: number;
  reason: string;
};

const LEVELS: { value: BibleUserLevel; label: string }[] = [
  { value: 'nunca_lei', label: 'Nunca he leído la Biblia' },
  { value: 'algo_suelto', label: 'La abro alguna vez, sin método' },
  { value: 'leo_a_veces', label: 'Leo de vez en cuando' },
  { value: 'constante', label: 'Leo habitualmente' },
];

const MINUTES = [5, 10, 15, 20, 30];
const MOMENTS = [
  { value: 'mañana', label: 'Mañana' },
  { value: 'mediodia', label: 'Mediodía' },
  { value: 'noche', label: 'Noche' },
];
const GOALS: { value: BibleGoalTag; label: string }[] = [
  { value: 'conocer_a_jesus', label: 'Conocer a Jesús' },
  { value: 'orar_mejor', label: 'Orar mejor' },
  { value: 'entender_la_biblia', label: 'Entender la Biblia' },
  { value: 'seguir_la_misa', label: 'Seguir la Misa' },
  { value: 'un_tema_concreto', label: 'Un tema concreto' },
];
const TOPICS = ['perdon', 'ansiedad', 'duelo', 'familia', 'vocacion', 'esperanza'] as const;

export function useOnboarding() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    level: 'nunca_lei',
    minutes_per_day: 10,
    goal: 'conocer_a_jesus',
  });
  const [recommendation, setRecommendation] = useState<RecommendResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<OnboardingData>) => setData((d) => ({ ...d, ...patch }));

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const computeRecommendation = () => {
    const result = recommendPlan({
      level: data.level,
      minutes_per_day: data.minutes_per_day,
      preferred_time: data.preferred_time,
      goal: data.goal,
      topic: data.topic,
    });
    setRecommendation(result);
    setStep(4);
  };

  const saveAndStart = async () => {
    setError('Inicia sesión para guardar tu plan.');
  };

  return {
    step,
    data,
    update,
    next,
    back,
    computeRecommendation,
    saveAndStart,
    recommendation,
    saving,
    error,
    levels: LEVELS,
    minutesOptions: MINUTES,
    moments: MOMENTS,
    goals: GOALS,
    topics: TOPICS,
  };
}
