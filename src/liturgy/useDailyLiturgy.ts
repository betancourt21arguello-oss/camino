import { useCallback, useEffect, useState } from "react";
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
  const [generating, setGenerating] = useState(false);

  const date = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL(`${WORKER_API_BASE}/daily`);
      url.searchParams.set("date", date);
      url.searchParams.set("_t", String(Date.now()));
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`Daily API ${res.status}`);
      const data = await res.json();
      setPayload({
        liturgy: data.liturgy ?? data.daily ?? data,
        monthEvents: data.monthEvents ?? [],
        pastProgress: data.pastProgress ?? {},
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar Gemini Daily");
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const generateNow = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${WORKER_API_BASE}/daily/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error(`Generate Daily ${res.status}`);
      await load();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar el contenido del día.");
    } finally {
      setGenerating(false);
    }
  }, [date, load]);

  return { ...payload, loading, error, generating, generateNow };
}

export function todayDayFromLiturgy(liturgy: DailyLiturgy | null) {
  const d = liturgy?.date ? new Date(`${liturgy.date}T00:00:00`) : new Date();
  return d.getDate();
}
