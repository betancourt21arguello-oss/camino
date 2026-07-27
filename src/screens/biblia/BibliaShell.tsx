import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { BibliaHomeScreen } from './BibliaHomeScreen';
import { BibliaOnboardingScreen } from './BibliaOnboardingScreen';
import { BibliaDailyScreen } from './BibliaDailyScreen';

export function BibliaShell() {
  const { view } = useBibliaRouter();

  if (view.route === 'onboarding') {
    return <BibliaOnboardingScreen />;
  }

  if (view.route === 'diario') {
    return <BibliaDailyScreen />;
  }

  return <BibliaHomeScreen />;
}
