import { AudioPlayer } from "../components/AudioPlayer";
import type { WhatsAppAsset } from "../media/types";

export function AudioAssetScreen({ asset, onClose }: { asset: WhatsAppAsset; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#f8f6f0] text-[#1c1c1e]">
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
        <div className="text-[10px] font-semibold tracking-[0.2em] text-[#a68b4e]">
          RECIBIDO POR WHATSAPP
        </div>
        <div className="w-11" />
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-7 py-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a9a9f]">
          {asset.tag}
        </div>
        <h1 className="mt-2 font-serif-holy text-3xl font-semibold leading-tight">{asset.title}</h1>
        <p className="mt-2 text-sm text-[#8a8a90]">Compartido por {asset.author}</p>
        <div className="mt-8">
          <AudioPlayer asset={asset} />
        </div>
        {asset.transcript && (
          <div className="mt-8 border-l-2 border-[#c4a35a] pl-4">
            <div className="text-[10px] tracking-[0.16em] text-[#9a9a9f]">TRANSCRIPCIÓN</div>
            <p className="mt-2 font-serif-holy text-xl leading-relaxed">{asset.transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
}
