import { useEffect, useMemo, useState } from 'react';
import { WORKER_API_BASE } from '@/config';
import { caracasDate } from '@/utils/caracas';

export type BibleDailyContent = {
  id?: number;
  user_id: string;
  date: string;
  passageRef?: string;
  passageText?: string;
  contextNote?: string;
  reflection?: string;
  prayer?: string;
  action?: string;
  verseOfDay?: string;
  suggestedTime?: string;
  theme?: string;
  mood?: string;
  generated_by?: string;
  created_at?: string;
};

type UseBibliaDailyResult = {
  content: BibleDailyContent | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const normalizeDailyContent = (raw: any): BibleDailyContent | null => {
  if (!raw || typeof raw !== 'object') return null;
  const nested = raw?.content && typeof raw.content === 'object' ? raw.content : raw;
  return {
    id: raw?.id,
    user_id: raw?.user_id || nested?.user_id || '',
    date: raw?.date || nested?.date || '',
    passageRef: nested?.passageRef,
    passageText: nested?.passageText,
    contextNote: nested?.contextNote,
    reflection: nested?.reflection,
    prayer: nested?.prayer,
    action: nested?.action,
    verseOfDay: nested?.verseOfDay,
    suggestedTime: nested?.suggestedTime,
    theme: nested?.theme,
    mood: nested?.mood,
    generated_by: raw?.generated_by || nested?.generated_by,
    created_at: raw?.created_at || nested?.created_at,
  };
};

export function useBibliaDaily(userId?: string, date?: string): UseBibliaDailyResult {
  const [content, setContent] = useState<BibleDailyContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const targetDate = useMemo(() => date || caracasDate(), [date]);

  useEffect(() => {
    if (!userId) {
      setContent(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const url = `${WORKER_API_BASE}/bible/daily?user_id=${encodeURIComponent(userId)}&date=${encodeURIComponent(targetDate)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to fetch daily content: ${res.status} ${text}`);
        }
        const existing = await res.json();
        if (!active) return;

        if (existing) {
          setContent(normalizeDailyContent(existing));
          setLoading(false);
          return;
        }

        const generateUrl = `${WORKER_API_BASE}/bible/daily`;
        const genRes = await fetch(generateUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, date: targetDate }),
        });
        if (!genRes.ok) {
          const text = await genRes.text();
          throw new Error(`Failed to generate daily content: ${genRes.status} ${text}`);
        }
        if (!active) return;
        const generated = await genRes.json();
        setContent(normalizeDailyContent(generated));
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || 'Error al cargar el contenido diario');
        setContent(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [userId, targetDate, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return { content, loading, error, refresh };
}
