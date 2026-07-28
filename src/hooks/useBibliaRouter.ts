import { useEffect, useMemo, useState } from 'react';

export type BibliaView =
  | { route: 'home' }
  | { route: 'onboarding' }
  | { route: 'hoy' }
  | { route: 'plan' }
  | { route: 'aprender' }
  | { route: 'metodos' }
  | { route: 'dudas' }
  | { route: 'recursos' }
  | { route: 'diario' };

const ALLOWED_ROUTES = new Set<BibliaView['route']>([
  'home', 'onboarding', 'hoy', 'plan', 'aprender', 'metodos', 'dudas', 'recursos', 'diario',
]);

export function useBibliaRouter() {
  const [view, setView] = useState<BibliaView>({ route: 'home' });

  useEffect(() => {
    const parse = () => {
      const hash = window.location.hash.replace(/^#/, '');
      const path = hash.startsWith('/biblia') ? hash.slice(7) : hash;
      const segments = path.split('/').filter(Boolean);
      const first = (segments[0] || '') as BibliaView['route'];

      if (ALLOWED_ROUTES.has(first)) {
        setView({ route: first });
      } else {
        setView({ route: 'home' });
      }
    };

    parse();
    window.addEventListener('hashchange', parse);
    return () => window.removeEventListener('hashchange', parse);
  }, []);

  const navigate = useMemo(() => ({
    home: () => { window.location.hash = '#/biblia'; },
    empezar: () => { window.location.hash = '#/biblia/empezar'; },
    hoy: () => { window.location.hash = '#/biblia/hoy'; },
    plan: () => { window.location.hash = '#/biblia/plan'; },
    aprender: () => { window.location.hash = '#/biblia/aprender'; },
    metodos: () => { window.location.hash = '#/biblia/metodos'; },
    dudas: () => { window.location.hash = '#/biblia/dudas'; },
    recursos: () => { window.location.hash = '#/biblia/recursos'; },
    diario: () => { window.location.hash = '#/biblia/diario'; },
  }), []);

  return { view, navigate };
}
