import { useEffect, useMemo, useState } from 'react';
import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { useAuth } from '@/auth/AuthProvider';
import { getMethods, getPlans, getUserEnrollment, getUserProfile } from '@/lib/bible/client';
import type { BibleEnrollmentStatus, BibleMethod, BiblePlan, UserBibleEnrollment, UserBibleProfile } from '@/types/bible';

export function useBibliaHome() {
  const { user } = useAuth();
  const { navigate } = useBibliaRouter();
  const [enrollment, setEnrollment] = useState<UserBibleEnrollment | null>(null);
  const [profile, setProfile] = useState<UserBibleProfile | null>(null);
  const [methods, setMethods] = useState<BibleMethod[]>([]);
  const [plans, setPlans] = useState<BiblePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

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
      setLoading(false);
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
  };
}
