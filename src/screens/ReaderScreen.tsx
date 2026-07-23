type Props = {
  eyebrow: string;
  title: string;
  ref?: string;
  body: string;
  onClose: () => void;
  onComplete?: () => void;
  completeLabel?: string;
};

export function ReaderScreen({
  eyebrow,
  title,
  ref: reference,
  body,
  onClose,
  onComplete,
  completeLabel = "Marcar como rezado",
}: Props) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#faf9f6] text-[#1c1c1e]">
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
        <div className="text-[11px] font-semibold tracking-[0.2em] text-[#c4a35a]">
          {eyebrow}
        </div>
        <div className="w-11" />
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-7 pt-2">
        <h1 className="font-serif-holy text-3xl font-bold leading-tight">{title}</h1>
        {reference && (
          <p className="mt-2 text-sm font-medium tracking-wide text-[#c4a35a]">
            {reference}
          </p>
        )}
        <p className="mt-6 whitespace-pre-line font-serif-holy text-[19px] leading-relaxed text-[#2a2a2e]">
          {body}
        </p>
        <div className="h-8" />
      </div>

      {onComplete && (
        <div className="px-6 pb-10 pt-2">
          <button
            onClick={onComplete}
            className="h-14 w-full rounded-full bg-[#1c1c1e] text-[15px] font-medium text-white transition active:scale-[0.99]"
          >
            {completeLabel}
          </button>
        </div>
      )}
    </div>
  );
}
