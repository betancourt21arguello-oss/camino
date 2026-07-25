import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { useBibliaHome } from './useBibliaHome';

export function BibliaHomeScreen() {
  const { navigate } = useBibliaRouter();
  const { loading, hasActivePlan, enrollment, profile, plans } = useBibliaHome();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f6f3]">
        <p className="text-sm text-[#6b6b70]">Cargando…</p>
      </div>
    );
  }

  if (!hasActivePlan) {
    return (
      <div className="flex h-full flex-col bg-[#f7f6f3]">
        <div className="flex-1 overflow-y-auto px-6 pt-8">
          <h1 className="text-3xl font-semibold text-[#1c1c1e]">
            Aprende a leer la<br />
            Palabra de Dios
          </h1>
          <p className="mt-3 text-base text-[#6b6b70]">
            Un camino de 10 minutos al día, con la Iglesia, sin abrumarte.
          </p>

          <blockquote className="mt-8 border-l-4 border-[#a68b4e] pl-4">
            <p className="text-sm italic text-[#6b6b70]">
              "El desconocimiento de las Escrituras es desconocimiento de Cristo"
            </p>
            <cite className="mt-1 block text-xs text-[#9a9a9f]">
              San Jerónimo, cit. en Dei Verbum 25
            </cite>
          </blockquote>

          <button
            onClick={() => navigate.empezar()}
            className="mt-8 w-full rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white"
          >
            Comenzar mi camino
          </button>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => navigate.aprender()}
              className="rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
            >
              <span className="text-sm font-medium text-[#1c1c1e]">¿Por qué no abrir la Biblia al azar?</span>
            </button>
            <button
              onClick={() => navigate.metodos()}
              className="rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
            >
              <span className="text-sm font-medium text-[#1c1c1e]">¿Qué es la Lectio Divina?</span>
            </button>
            <button
              onClick={() => navigate.dudas()}
              className="rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
            >
              <span className="text-sm font-medium text-[#1c1c1e]">Solo tengo 5 minutos</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const plan = plans.find((p) => p.id === enrollment.plan_id);
  const progress = enrollment.current_day / (plan?.days_count ?? 30);

  return (
    <div className="flex h-full flex-col bg-[#f7f6f3]">
      <div className="flex-1 overflow-y-auto px-6 pt-8">
        <h2 className="text-2xl font-semibold text-[#1c1c1e]">Biblia</h2>

        <div className="mt-6 rounded-2xl border border-[#e6e3db] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#a68b4e]">Hoy</p>
              <p className="mt-1 text-sm text-[#6b6b70]">
                Día {enrollment.current_day} de {plan?.days_count ?? '?'}
              </p>
            </div>
            <span className="text-xs text-[#9a9a9f]">{plan?.minutes_per_day ?? 10} min</span>
          </div>

          <div className="mt-4 h-2 rounded-full bg-[#e6e3db]">
            <div
              className="h-full rounded-full bg-[#a68b4e] transition-all"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>

          <button
            onClick={() => navigate.hoy()}
            className="mt-6 w-full rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white"
          >
            Comenzar lectura de hoy
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate.diario()}
            className="rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
          >
            <span className="text-sm font-medium text-[#1c1c1e]">Diario</span>
          </button>
          <button
            onClick={() => navigate.aprender()}
            className="rounded-2xl border border-[#e6e3db] bg-white p-4 text-left"
          >
            <span className="text-sm font-medium text-[#1c1c1e]">Aprender</span>
          </button>
        </div>
      </div>
    </div>
  );
}
