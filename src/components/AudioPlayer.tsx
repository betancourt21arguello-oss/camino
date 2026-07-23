import { useEffect, useRef, useState } from "react";
import type { WhatsAppAsset } from "../media/types";
import { formatDuration } from "../media/registry";

export function AudioPlayer({ asset, compact = false }: { asset: WhatsAppAsset; compact?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!playing || asset.audioUrl) return;
    const id = window.setInterval(
      () => setElapsed((value) => (value >= asset.duration ? 0 : value + 1)),
      1000,
    );
    return () => window.clearInterval(id);
  }, [playing, asset.audioUrl, asset.duration]);

  const toggle = async () => {
    if (asset.audioUrl && audioRef.current) {
      if (playing) audioRef.current.pause();
      else await audioRef.current.play();
    }
    setPlaying((value) => !value);
  };

  const progress = Math.min(1, elapsed / asset.duration);

  return (
    <div className={compact ? "py-2" : "rounded-2xl border border-[#e6e3db] bg-white p-4"}>
      {asset.audioUrl && (
        <audio
          ref={audioRef}
          src={asset.audioUrl}
          onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
          onEnded={() => setPlaying(false)}
        />
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1c1c1e] text-white"
          aria-label={playing ? "Pausar audio" : "Reproducir audio"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
              <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-[#1c1c1e]">{asset.title}</div>
          <div className="text-xs text-[#8a8a90]">{asset.author} · vía WhatsApp</div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#e9e5dc]">
            <div
              className="h-full rounded-full bg-[#c4a35a] transition-all"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <div className="text-xs tabular-nums text-[#9a9a9f]">
          {formatDuration(asset.duration)}
        </div>
      </div>
    </div>
  );
}
