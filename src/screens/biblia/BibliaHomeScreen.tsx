import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { useBibliaHome } from './useBibliaHome';

export function BibliaHomeScreen() {
  const { navigate } = useBibliaRouter();
  const { loading, hasActivePlan, enrollment, plans, dailyContent } = useBibliaHome();

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

           {dailyContent && (
             <button
               onClick={() => navigate.diario()}
               className="mt-6 w-full rounded-2xl border border-[#a68b4e] bg-[#fdfcf8] p-5 text-left transition active:scale-[0.98]"
             >
               <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a68b4e]">Contenido diario personalizado</span>
               <p className="mt-2 text-sm font-medium text-[#1c1c1e] line-clamp-2">{dailyContent.passageRef}</p>
               <p className="mt-1 text-xs text-[#6b6b70] line-clamp-2">{dailyContent.reflection}</p>
               <span className="mt-3 inline-block rounded-full bg-[#1c1c1e] px-4 py-2 text-xs font-medium text-white">
                 Abrir mi lectura de hoy
               </span>
             </button>
           )}
         </div>
       </div>
     );
   }

   const plan = plans.find((p) => p.id === enrollment?.plan_id);
   const progress = (enrollment?.current_day ?? 0) / (plan?.days_count ?? 30);

  return (
    <div className="flex h-full flex-col bg-[#f7f6f3]">
      <div className="flex-1 overflow-y-auto px-6 pt-8">
        <h2 className="text-2xl font-semibold text-[#1c1c1e]">Biblia</h2>

        <div className="mt-6 rounded-2xl border border-[#e6e3db] bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#a68b4e]">Hoy</p>
              <p className="mt-1 text-sm text-[#6b6b70]">
                 Día {enrollment?.current_day ?? 0} de {plan?.days_count ?? '?'}
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
             className="flex flex-col items-center gap-2 rounded-2xl border border-[#e6e3db] bg-white p-5 text-center transition active:scale-[0.98]"
           >
             <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1c1e] text-white text-lg">✨</span>
             <span className="text-sm font-medium text-[#1c1c1e]">Diario IA</span>
             <span className="text-[10px] text-[#8a8a90]">Lectura personalizada</span>
           </button>
           <button
             onClick={() => navigate.aprender()}
             className="flex flex-col items-center gap-2 rounded-2xl border border-[#e6e3db] bg-white p-5 text-center transition active:scale-[0.98]"
           >
             <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1c1c1e] text-white text-lg">🎓</span>
             <span className="text-sm font-medium text-[#1c1c1e]">Aprender</span>
             <span className="text-[10px] text-[#8a8a90]">Métodos y lectio</span>
           </button>
         </div>
      </div>
    </div>
  );
}
