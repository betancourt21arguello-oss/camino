import { useEffect, useState } from "react";
import { CommunityWorkSvg } from "../community/CommunityWorkSvg";
import { COMPOSITION_LABELS } from "../community/composition";
import { loadGallery, loadGalleryFromSupabase } from "../community/gallery";
import type { CommunityWorkSeed } from "../community/types";

export function GalleryScreen({ onClose }: { onClose: () => void }) {
  const [works, setWorks] = useState<CommunityWorkSeed[]>([]);
  const [selected, setSelected] = useState<CommunityWorkSeed | null>(null);

  useEffect(() => {
    let cancelled = false;
    const local = loadGallery();
    loadGalleryFromSupabase().then((remote) => {
      if (cancelled) return;
      const merged = new Map<string, CommunityWorkSeed>();
      for (const w of remote) merged.set(w.id, w);
      for (const w of local) merged.set(w.id, w);
      setWorks(Array.from(merged.values()).sort((a, b) => b.completedAt - a.completedAt).slice(0, 40));
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#f7f6f3] text-[#1c1c1e]">
      <div className="flex items-center justify-between px-5 pb-2 pt-12">
        <button
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#8a8a90]"
          aria-label="Cerrar"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <div className="text-center">
          <div className="text-[10px] font-semibold tracking-[0.2em] text-[#a68b4e]">
            MUSEO VIVO
          </div>
          <div className="font-serif-holy text-xl font-semibold">Galería de Oración</div>
        </div>
        <div className="w-11" />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-10">
        <p className="mx-auto max-w-sm text-center text-sm leading-relaxed text-[#8a8a90]">
          Cada Rosario Comunitario deja una obra irrepetible. No se guarda el SVG:
          solo su semilla. El navegador la reconstruye cada vez.
        </p>

        {works.length === 0 ? (
          <div className="mt-16 text-center text-sm text-[#a8a8ad]">
            Aún no hay obras. Completa un Rosario Comunitario para nacer la primera.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3">
            {works.map((work) => (
              <button
                key={work.id}
                onClick={() => setSelected(work)}
                className="overflow-hidden rounded-3xl border border-[#e6e3db] bg-black text-left"
              >
                <CommunityWorkSvg
                  communitySeed={work.communitySeed}
                  composition={work.composition}
                  signatures={work.signatures}
                  progress={1}
                  complete
                />
                <div className="bg-white p-3">
                  <div className="truncate font-serif-holy text-sm font-semibold">
                    {work.title}
                  </div>
                  <div className="mt-0.5 text-[10px] tracking-wide text-[#9a9a9f]">
                    {COMPOSITION_LABELS[work.composition]} · 🙏 {work.participants}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="absolute inset-0 z-10 flex flex-col bg-[#070708] text-white">
          <div className="flex items-center justify-between px-5 pt-12">
            <button onClick={() => setSelected(null)} className="h-10 text-sm text-white/50">
              ← Volver
            </button>
            <div className="text-[10px] tracking-[0.18em] text-[var(--gold)]">
              {COMPOSITION_LABELS[selected.composition].toUpperCase()}
            </div>
            <div className="w-14" />
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-10">
            <div className="mx-auto mt-4 max-w-sm overflow-hidden rounded-[2rem] border border-white/10">
              <CommunityWorkSvg
                communitySeed={selected.communitySeed}
                composition={selected.composition}
                signatures={selected.signatures}
                progress={1}
                complete
              />
            </div>
            <h2 className="mt-6 text-center font-serif-holy text-3xl text-[var(--gold)]">
              {selected.title}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-white/65">
              Reconstruida desde {selected.signatures.length} firmas espirituales y la
              semilla comunitaria {selected.communitySeed.slice(0, 10)}…
            </p>
            <div className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-white/10 py-3">🙏 {selected.participants}</div>
              <div className="rounded-2xl border border-white/10 py-3">🕯️ {selected.intentions}</div>
              <div className="rounded-2xl border border-white/10 py-3">
                🌹 {selected.aveMarias.toLocaleString("es")}
              </div>
              <div className="rounded-2xl border border-white/10 py-3">📿 1</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
