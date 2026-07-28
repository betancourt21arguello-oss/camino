import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { useOnboarding } from './useOnboarding';

export function BibliaOnboardingScreen() {
  const { navigate } = useBibliaRouter();
  const {
    step,
    data,
    update,
    next,
    back,
    saveAndStart,
    recommendation,
    saving,
    error,
    levels,
    minutesOptions,
    moments,
    goals,
    topics,
  } = useOnboarding();

  const totalSteps = 5;
  const progress = ((step + 1) / totalSteps) * 100;

  return (
    <div className="flex h-full flex-col bg-[#f7f6f3]">
      <header className="flex items-center justify-between px-6 pt-8">
        <button onClick={() => navigate.home()} className="text-sm text-[#6b6b70]">
          Saltar
        </button>
        <span className="text-sm font-medium text-[#6b6b70]">
          Paso {step + 1} de {totalSteps}
        </span>
      </header>

      <div className="mx-auto mt-4 h-1 w-full max-w-sm px-6">
        <div className="h-full rounded-full bg-[#e6e3db]">
          <div className="h-full rounded-full bg-[#a68b4e] transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8">
        {error && (
          <p className="mb-4 text-center text-sm text-red-600">{error}</p>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold text-[#1c1c1e]">¿Cuánta experiencia tienes con la Biblia?</h1>
            <p className="text-sm text-[#6b6b70]">Esto nos ayuda a recomendarte el mejor camino.</p>
            <div className="flex flex-col gap-3">
              {levels.map((l) => (
                <button
                  key={l.value}
                  onClick={() => update({ level: l.value })}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    data.level === l.value
                      ? 'border-[#a68b4e] bg-[#fdfcf8]'
                      : 'border-[#e6e3db] bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-[#1c1c1e]">{l.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={next}
              className="mt-6 w-full rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white"
            >
              Continuar
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold text-[#1c1c1e]">¿Cuánto tiempo real puedes dedicar?</h1>
            <p className="text-sm text-[#6b6b70]">El default es 10 minutos. Nunca más al inicio.</p>
            <div className="flex flex-col gap-3">
              {minutesOptions.map((m) => (
                <button
                  key={m}
                  onClick={() => update({ minutes_per_day: m })}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    data.minutes_per_day === m
                      ? 'border-[#a68b4e] bg-[#fdfcf8]'
                      : 'border-[#e6e3db] bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-[#1c1c1e]">{m} minutos</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={back} className="flex-1 rounded-full border border-[#e6e3db] px-6 py-3 text-sm font-medium text-[#6b6b70]">
                Atrás
              </button>
              <button onClick={next} className="flex-1 rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white">
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold text-[#1c1c1e]">¿En qué momento del día?</h1>
            <p className="text-sm text-[#6b6b70]">Te enviaremos un recordatorio suave a esa hora.</p>
            <div className="flex flex-col gap-3">
              {moments.map((m) => (
                <button
                  key={m.value}
                  onClick={() => update({ preferred_time: m.value })}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    data.preferred_time === m.value
                      ? 'border-[#a68b4e] bg-[#fdfcf8]'
                      : 'border-[#e6e3db] bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-[#1c1c1e]">{m.label}</span>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={back} className="flex-1 rounded-full border border-[#e6e3db] px-6 py-3 text-sm font-medium text-[#6b6b70]">
                Atrás
              </button>
              <button onClick={next} className="flex-1 rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white">
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-semibold text-[#1c1c1e]">¿Qué buscas?</h1>
            <p className="text-sm text-[#6b6b70]">Elige el objetivo que más te motiva hoy.</p>
            <div className="flex flex-col gap-3">
              {goals.map((g) => (
                <button
                  key={g.value}
                  onClick={() => update({ goal: g.value })}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    data.goal === g.value
                      ? 'border-[#a68b4e] bg-[#fdfcf8]'
                      : 'border-[#e6e3db] bg-white'
                  }`}
                >
                  <span className="text-sm font-medium text-[#1c1c1e]">{g.label}</span>
                </button>
              ))}
            </div>

            {data.goal === 'un_tema_concreto' && (
              <div className="mt-4 flex flex-wrap gap-2">
                {topics.map((t) => (
                  <button
                    key={t}
                    onClick={() => update({ topic: t })}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                      data.topic === t
                        ? 'border-[#a68b4e] bg-[#fdfcf8] text-[#1c1c1e]'
                        : 'border-[#e6e3db] bg-white text-[#6b6b70]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={back} className="flex-1 rounded-full border border-[#e6e3db] px-6 py-3 text-sm font-medium text-[#6b6b70]">
                Atrás
              </button>
              <button onClick={next} className="flex-1 rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white">
                Continuar
              </button>
            </div>
          </div>
        )}

        {step === 4 && recommendation && (
          <div className="flex flex-col gap-6">
            <div className="rounded-2xl border border-[#a68b4e] bg-[#fdfcf8] p-6">
              <h2 className="text-lg font-semibold text-[#1c1c1e]">Tu recomendación</h2>
              <p className="mt-2 text-sm text-[#6b6b70]">{recommendation.reason}</p>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6b6b70]">Plan</span>
                  <span className="font-medium text-[#1c1c1e]">{recommendation.plan_slug}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6b6b70]">Método</span>
                  <span className="font-medium text-[#1c1c1e]">{recommendation.method_slug}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6b6b70]">Duración</span>
                  <span className="font-medium text-[#1c1c1e]">{recommendation.minutes_per_day} min/día</span>
                </div>
              </div>
            </div>

            <button
              onClick={saveAndStart}
              disabled={saving}
              className="w-full rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Empezar hoy'}
            </button>
            <button
              onClick={() => navigate.home()}
              className="text-center text-sm text-[#6b6b70]"
            >
              Prefiero elegir otro plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
