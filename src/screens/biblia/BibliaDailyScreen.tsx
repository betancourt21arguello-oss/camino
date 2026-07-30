import { useMemo, useState } from 'react';
import { useBibliaRouter } from '@/hooks/useBibliaRouter';
import { useAuth } from '@/auth/AuthProvider';
import { useBibliaDaily } from './useBibliaDaily';
import { supabase } from '@/lib/supabase';
import { caracasDate } from '@/utils/caracas';

function Section({ eyebrow, title, children }: { eyebrow?: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      {eyebrow && <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9f]">{eyebrow}</p>}
      {title && <h3 className="mt-1 text-base font-semibold text-[#1c1c1e]">{title}</h3>}
      <div className="mt-2 text-[15px] leading-relaxed text-[#3a3a40] whitespace-pre-line">{children}</div>
    </div>
  );
}

export function BibliaDailyScreen() {
  const { user } = useAuth();
  const { navigate } = useBibliaRouter();
  const { content, loading, error, refresh } = useBibliaDaily(user?.id);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  const themeLabel = useMemo(() => content?.theme || '', [content?.theme]);
  const moodEmoji = useMemo(() => {
    const mood = content?.mood;
    if (!mood) return '📖';
    const map: Record<string, string> = {
      esperanza: '✨',
      consuelo: '🕊️',
      gratitud: '🙏',
      fortaleza: '💪',
      alegria: '😊',
      paz: '🕊️',
      confianza: '🤝',
    };
    return map[mood] || '📖';
  }, [content?.mood]);

  const handleComplete = async () => {
    if (!user?.id || !content?.date) return;
    setCompleting(true);
    setCompletionError(null);
    try {
      const todayStr = content.date;
      const { data: existingStreak, error: streakFetchError } = await supabase!
        .from('user_bible_streak')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (streakFetchError) {
        throw new Error(streakFetchError.message || 'No se pudo obtener tu racha');
      }

      const lastCompleted = existingStreak?.last_completed_date || null;
      const currentStreak = existingStreak?.current_streak || 0;
      const longestStreak = existingStreak?.longest_streak || 0;

      const yesterdayStr = caracasDate(new Date(Date.now() - 86400000));

      let newStreak = currentStreak;
      if (lastCompleted === todayStr) {
        newStreak = currentStreak;
      } else if (lastCompleted === yesterdayStr) {
        newStreak = currentStreak + 1;
      } else {
        newStreak = 1;
      }

      const { error: upsertError } = await supabase!
        .from('user_bible_streak')
        .upsert(
          {
            user_id: user.id,
            current_streak: newStreak,
            longest_streak: Math.max(longestStreak, newStreak),
            last_completed_date: todayStr,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );

      if (upsertError) {
        throw new Error(upsertError.message || 'No se pudo actualizar tu progreso');
      }

      setCompleted(true);
    } catch (e: any) {
      setCompletionError(e?.message || 'Error al guardar tu progreso');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f7f6f3]">
        <p className="text-sm text-[#6b6b70]">Generando tu contenido diario…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f7f6f3] px-6">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={() => refresh()}
          className="rounded-full bg-[#1c1c1e] px-6 py-2 text-sm font-medium text-white"
        >
          Reintentar
        </button>
        <button onClick={() => navigate.home()} className="text-sm text-[#6b6b70]">
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[#f7f6f3]">
        <p className="text-sm text-[#6b6b70]">No hay contenido disponible todavía.</p>
        <button onClick={() => navigate.home()} className="text-sm text-[#6b6b70]">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#f7f6f3]">
      <div className="flex items-center justify-between px-6 pt-6">
        <button onClick={() => navigate.home()} className="text-sm text-[#6b6b70]">
          ← Volver
        </button>
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9a9a9f]">
          {themeLabel ? `Tema: ${themeLabel}` : 'Contenido diario'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl" aria-hidden>{moodEmoji}</span>
          <div>
            <h2 className="text-xl font-semibold text-[#1c1c1e]">Tu pan de hoy</h2>
            <p className="text-xs text-[#9a9a9f]">
              {content.suggestedTime === 'mañana'
                ? 'Ideal para tu mañana'
                : content.suggestedTime === 'mediodia'
                  ? 'Ideal para el mediodía'
                  : content.suggestedTime === 'noche'
                    ? 'Ideal para la noche'
                    : 'Contenido personalizado para hoy'}
            </p>
          </div>
        </div>

        {completionError && (
          <p className="mt-4 text-center text-sm text-red-600">{completionError}</p>
        )}

        {content.verseOfDay && (
          <div className="mt-6 rounded-2xl border border-[#e6e3db] bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a68b4e]">Versículo clave</p>
            <p className="mt-2 text-base font-medium text-[#1c1c1e]">“{content.verseOfDay}”</p>
          </div>
        )}

        <Section eyebrow="Palabra" title={content.passageRef}>
          {content.passageText}
        </Section>

        {content.contextNote && (
          <Section eyebrow="Contexto">{content.contextNote}</Section>
        )}

        {content.reflection && (
          <Section eyebrow="Reflexión">{content.reflection}</Section>
        )}

        {content.prayer && (
          <Section eyebrow="Oración">{content.prayer}</Section>
        )}

        {content.action && (
          <div className="mt-6 rounded-2xl border border-[#a68b4e] bg-[#fdfcf8] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a68b4e]">Acción para hoy</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#3a3a40]">{content.action}</p>
          </div>
        )}

        {(content.theme || content.mood) && (
          <div className="mt-6 flex items-center gap-2">
            {content.theme && (
              <span className="rounded-full border border-[#e6e3db] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b6b70]">
                {content.theme}
              </span>
            )}
            {content.mood && (
              <span className="rounded-full border border-[#e6e3db] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6b6b70]">
                {content.mood}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-[#e6e3db] bg-[#f7f6f3]/90 pb-8 pt-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md px-6">
          {!completed ? (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="w-full rounded-full bg-[#1c1c1e] px-6 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {completing ? 'Guardando…' : 'He completado mi lectura de hoy'}
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-center text-sm font-semibold text-[#a68b4e]">¡Gracias por tu tiempo de Palabra hoy!</p>
              <p className="text-center text-xs text-[#6b6b70]">Tu progreso ha sido actualizado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
