import { useEffect, useState } from "react";
import { WORKER_API_BASE } from "../config";
import type { DailyLiturgy, LiturgicalEvent } from "./types";

export interface DailyPayload {
  liturgy: DailyLiturgy | null;
  monthEvents: LiturgicalEvent[];
  pastProgress: Record<number, { rosaries: number; done: boolean }>;
}

export function useDailyLiturgy() {
  const [payload, setPayload] = useState<DailyPayload>({
    liturgy: null,
    monthEvents: [],
    pastProgress: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const date = new Date().toISOString().slice(0, 10);
    fetch(`${WORKER_API_BASE}/daily?date=${date}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Daily API ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setPayload({
          liturgy: data.liturgy ?? data.daily ?? data,
          monthEvents: data.monthEvents ?? [],
          pastProgress: data.pastProgress ?? {},
        });
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "No se pudo cargar Gemini Daily");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { ...payload, loading, error };
}

export function todayDayFromLiturgy(liturgy: DailyLiturgy | null) {
  const d = liturgy?.date ? new Date(`${liturgy.date}T00:00:00`) : new Date();
  return d.getDate();
}
