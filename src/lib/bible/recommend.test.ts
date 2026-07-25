import { describe, it, expect } from 'vitest';
import { recommendPlan } from '@/lib/bible/recommend';
import type { OnboardingData } from '@/screens/biblia/useOnboarding';

function profile(overrides: Partial<OnboardingData> = {}): OnboardingData {
  return {
    level: 'nunca_lei',
    minutes_per_day: 10,
    goal: 'conocer_a_jesus',
    ...overrides,
  };
}

describe('recommendPlan', () => {
  it('nunca_lei o algo_suelto → 30-conoce-a-jesus + lectio-divina-simplificada', () => {
    const r = recommendPlan(profile({ level: 'nunca_lei' }));
    expect(r.plan_slug).toBe('30-conoce-a-jesus');
    expect(r.method_slug).toBe('lectio-divina-simplificada');
    expect(r.level).toBe('principiante');
    expect(r.minutes_per_day).toBeLessThanOrEqual(10);

    const r2 = recommendPlan(profile({ level: 'algo_suelto' }));
    expect(r2.plan_slug).toBe('30-conoce-a-jesus');
  });

  it('leo_a_veces + tiempo ≥15 → 60-nuevo-testamento', () => {
    const r = recommendPlan(profile({ level: 'leo_a_veces', minutes_per_day: 20 }));
    expect(r.plan_slug).toBe('60-nuevo-testamento');
    expect(r.method_slug).toBe('lectio-divina-simplificada');
    expect(r.level).toBe('intermedio');
  });

  it('constante → 90-panoramica-biblia', () => {
    const r = recommendPlan(profile({ level: 'constante', minutes_per_day: 20 }));
    expect(r.plan_slug).toBe('90-panoramica-biblia');
    expect(r.level).toBe('avanzado');
  });

  it('objetivo seguir_la_misa → 365-leccionario', () => {
    const r = recommendPlan(profile({ goal: 'seguir_la_misa', level: 'nunca_lei' }));
    expect(r.plan_slug).toBe('365-leccionario');
    expect(r.method_slug).toBe('lectura-leccionario');
  });

  it('objetivo un_tema_concreto → plan temático 14 días', () => {
    const r = recommendPlan(profile({ goal: 'un_tema_concreto', topic: 'ansiedad' }));
    expect(r.plan_slug).toBe('14-tematico');
    expect(r.method_slug).toBe('lectio-divina-simplificada');
    expect(r.reason).toContain('ansiedad');
  });
});
