import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { BibliaHomeScreen } from './BibliaHomeScreen';
import { BibliaOnboardingScreen } from './BibliaOnboardingScreen';

export function BibliaShell() {
  const { view } = useBibliaRouter();

  if (view.route === 'onboarding') {
    return <BibliaOnboardingScreen />;
  }

  return <BibliaHomeScreen />;
}
