import { useEffect, useMemo, useState } from 'react';
import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { useAuth } from '@/auth/AuthProvider';
import { getMethods, getPlans, getUserEnrollment, getUserProfile } from '@/lib/bible/client';
import type { BibleMethod, BiblePlan, UserBibleEnrollment, UserBibleProfile } from '@/types/bible';
import { useBibliaDaily, type BibleDailyContent } from './useBibliaDaily';

type UseBibliaHomeResult = {
  loading: boolean;
  hasActivePlan: boolean;
  enrollment: UserBibleEnrollment | null;
  profile: UserBibleProfile | null;
  methods: BibleMethod[];
  plans: BiblePlan[];
  navigate: ReturnType<typeof useBibliaRouter>['navigate'];
  dailyContent: BibleDailyContent | null;
};

export function useBibliaHome(): UseBibliaHomeResult {
  const { user } = useAuth();
  const { navigate } = useBibliaRouter();
  const [enrollment, setEnrollment] = useState<UserBibleEnrollment | null>(null);
  const [profile, setProfile] = useState<UserBibleProfile | null>(null);
  const [methods, setMethods] = useState<BibleMethod[]>([]);
  const [plans, setPlans] = useState<BiblePlan[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const { content: dailyContent, loading: dailyLoading } = useBibliaDaily(user?.id);

  const loading = useMemo(() => {
    if (!user) return false;
    return initialLoading || dailyLoading;
  }, [user, initialLoading, dailyLoading]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user) {
        setEnrollment(null);
        setProfile(null);
        setMethods([]);
        setPlans([]);
        setInitialLoading(false);
        return;
      }

      setInitialLoading(true);
      const [profileRes, enrollmentRes, methodsRes, plansRes] = await Promise.all([
        getUserProfile(user.id),
        getUserEnrollment(user.id),
        getMethods(),
        getPlans(),
      ]);

      if (!active) return;

      if (profileRes) setProfile(profileRes);
      if (enrollmentRes && enrollmentRes.status === 'active') setEnrollment(enrollmentRes);
      setMethods(methodsRes);
      setPlans(plansRes);
      setInitialLoading(false);
    };

    void run();
    return () => {
      active = false;
    };
  }, [user]);

  const hasActivePlan = useMemo(
    () => Boolean(enrollment && enrollment.status === 'active'),
    [enrollment],
  );

  return {
    loading,
    hasActivePlan,
    enrollment,
    profile,
    methods,
    plans,
    navigate,
    dailyContent,
  };
}
