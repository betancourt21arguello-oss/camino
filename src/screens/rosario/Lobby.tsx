import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RosaryRing } from "../../components/RosaryRing";
import { DEVOTIONS, DEVOTION_LIST, ROSARIO_IDS } from "../../engine/devotions";
import { devotionIdForToday } from "../../engine/devotions/rosarioMisterios";
import type { ActiveRoom } from "../../rosary/useActiveRooms";

type Props = {
  rooms: ActiveRoom[];
  roomsLoading: boolean;
  totalPraying: number;
  onStartCommunity: () => void;
  onStartSolo: () => void;
  onJoinRoom: (room: ActiveRoom) => void;
  onOpenGallery?: () => void;
  selectedDevotionId: string;
  onSelectDevotion: (id: string) => void;
};

export function Lobby({
  rooms,
  roomsLoading,
  totalPraying,
  onStartCommunity,
  onStartSolo,
  onJoinRoom,
  onOpenGallery,
  selectedDevotionId,
  onSelectDevotion,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

  const dev = DEVOTIONS[selectedDevotionId] ?? DEVOTION_LIST[0];
  const isRosario = ROSARIO_IDS.has(selectedDevotionId);
  const todayId = useMemo(() => devotionIdForToday(), []);

  // En el lobby no intentamos representar toda la estructura interna; solo
  // comunicamos visualmente si el usuario eligió Rosario o Coronilla.
  const { beadTotal, ringLabel } = useMemo(() => {
    return {
      beadTotal: isRosario ? 10 : 5,
      ringLabel: isRosario ? "AVE MARÍA" : "MISTERIO",
    };
  }, [isRosario]);

  // Texto del botón principal. Para los Rosarios se añade el nombre del
  // misterio al lado de "Iniciar Rosario Comunitario" (p. ej. "Iniciar
  // Rosario Comunitario · Misterios Dolorosos"). Para las coronillas se
  // muestra el nombre de la devoción seguido de "en comunidad".
  const yellowMain = isRosario
    ? `Iniciar Rosario Comunitario · ${dev.subtitle}`
    : `Iniciar ${dev.subtitle} en comunidad`;
  const soloMain = isRosario
    ? `Rezar ${dev.subtitle} en solitario`
    : `Rezar ${dev.subtitle} en solitario`;

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#0a0a0b] text-white">
      {/* ambiente */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 55% at 50% -8%, rgba(28,34,60,0.92), transparent 62%)" }}
      />
      {[
        { left: "14%", top: "22%", d: 7 },
        { left: "82%", top: "30%", d: 9 },
        { left: "68%", top: "12%", d: 11 },
        { left: "30%", top: "8%", d: 8 },
      ].map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-[3px] w-[3px] rounded-full bg-[var(--gold)]"
          style={{ left: p.left, top: p.top }}
          animate={{ opacity: [0.1, 0.7, 0.1], scale: [0.8, 1.4, 0.8] }}
          transition={{ duration: p.d, repeat: Infinity, ease: "easeInOut", delay: i * 0.6 }}
        />
      ))}

      {/* HEADER */}
      <header className="relative z-10 shrink-0 px-6 pt-10 text-center">
        <div className="text-[11px] font-medium tracking-[0.28em] text-[var(--gold)]">ORACIÓN PERPETUA</div>
        <button
          onClick={() => setMenuOpen(true)}
          className="group mx-auto mt-1.5 flex items-center justify-center gap-2"
          aria-label="Elegir devoción"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.h1
              key={dev.id}
              className="font-serif-holy text-[28px] font-bold leading-tight"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
            >
              {dev.title}
            </motion.h1>
          </AnimatePresence>
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 text-white/40 transition-transform group-hover:translate-y-0.5 group-hover:text-white/70"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="mt-1 h-5 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={dev.id}
              className="text-sm text-white/55"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.3 }}
            >
              {dev.subtitle}
            </motion.div>
          </AnimatePresence>
        </div>
      </header>

      {/* CONTADOR */}
      <div className="relative z-10 shrink-0 py-3">
        <RosaryRing
          topLabel={ringLabel}
          centerMain="0"
          centerSub={`de ${beadTotal}`}
          progress={0}
          beadTotal={beadTotal}
          beadDone={0}
          activeBead={-1}
          size={188}
        />
        <AnimatePresence>
          {totalPraying > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-1.5 text-xs"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5fce7e]" />
              <span className="font-medium text-[#5fce7e]">{totalPraying}</span>
              <span className="text-white/55">orando ahora mismo</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTONES */}
      <div className="relative z-10 shrink-0 space-y-2.5 px-6">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onStartCommunity}
          className="flex w-full flex-col items-center justify-center rounded-2xl bg-[var(--gold)] py-3 text-black transition active:brightness-95"
        >
          <span className="text-[15px] font-semibold leading-tight">
            {yellowMain}
          </span>
          <span className="text-[11px] font-medium leading-tight text-black/65">{dev.subtitle}</span>
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onStartSolo}
          className="flex w-full flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/[0.03] py-2.5 text-white/85 transition hover:bg-white/[0.06]"
        >
          <span className="text-[14px] font-medium leading-tight">{soloMain}</span>
          <span className="text-[11px] leading-tight text-white/45">{dev.subtitle}</span>
        </motion.button>

        {onOpenGallery && (
          <button
            onClick={onOpenGallery}
            className="w-full text-center text-[12px] text-[var(--gold)]/80 underline-offset-4 transition hover:text-[var(--gold)] hover:underline"
          >
            Galería de Oración
          </button>
        )}
      </div>

      {/* MURO DE SALAS VIVAS */}
      <section className="relative z-10 mt-4 flex min-h-0 flex-1 flex-col px-6 pb-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold tracking-[0.22em] text-white/45">SALAS EN ORACIÓN</h2>
          {!roomsLoading && rooms.length > 0 && (
            <span className="text-[11px] text-white/35">{rooms.length} activas</span>
          )}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
          {roomsLoading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <EmptyWall />
          ) : (
            <ul className="space-y-2">
              {rooms.map((room) => (
                <motion.li
                  key={room.sessionId}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-[var(--gold)]/40 hover:bg-white/[0.07]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-lg">
                    {room.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-white">{room.title}</div>
                    <div className="truncate text-[11px] text-white/45">{room.subtitle}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5 pr-1">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5fce7e] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5fce7e]" />
                    </span>
                    <span className="text-xs font-medium tabular-nums text-white/70">{room.participants}</span>
                  </div>
                  <button
                    onClick={() => onJoinRoom(room)}
                    className="shrink-0 rounded-full bg-[var(--gold)] px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-black transition group-hover:brightness-105 active:scale-95"
                  >
                    UNIRME
                  </button>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AnimatePresence>
        {menuOpen && (
          <DevotionMenu
            selectedId={selectedDevotionId}
            todayId={todayId}
            onPick={(id) => {
              onSelectDevotion(id);
              setMenuOpen(false);
            }}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------- muro vacío ----------------------------- */

function EmptyWall() {
  return (
    <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center">
      <motion.div
        className="relative mb-3 h-10 w-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <span className="absolute inset-x-0 bottom-0 top-2 rounded-t-sm rounded-b-[2px] bg-gradient-to-b from-[#e8ddc4] to-[#b9ad8c]" />
        <motion.span
          className="absolute -top-1 left-1/2 h-3 w-2 -translate-x-1/2 rounded-full bg-gradient-to-t from-[#ffb347] to-[#fff3c4]"
          animate={{ scaleY: [1, 1.18, 0.92, 1.1, 1], opacity: [0.85, 1, 0.8, 1, 0.9] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "bottom" }}
        />
        <span className="absolute -top-2 left-1/2 h-5 w-5 -translate-x-1/2 rounded-full bg-[var(--gold)] opacity-20 blur-md" />
      </motion.div>
      <p className="max-w-[220px] text-[13px] leading-relaxed text-white/55">
        Ahora mismo no hay ninguna sala en curso.
      </p>
      <p className="mt-1 text-[12px] italic text-white/35">Sé el primero en encender una llama.</p>
    </div>
  );
}

/* --------------------------- menú de devociones --------------------------- */

function DevotionMenu({
  selectedId,
  todayId,
  onPick,
  onClose,
}: {
  selectedId: string;
  todayId: string;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const rosarios = DEVOTION_LIST.filter((d) => ROSARIO_IDS.has(d.id));
  const coronillas = DEVOTION_LIST.filter((d) => !ROSARIO_IDS.has(d.id));

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-end bg-black/70 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="mb-4 max-h-[78%] w-full overflow-y-auto rounded-3xl border border-white/10 bg-[#141416] p-5"
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif-holy text-xl font-semibold text-white">Elige una devoción</h3>
          <button onClick={onClose} className="text-white/40 transition hover:text-white" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <Group label="ROSARIOS" items={rosarios} selectedId={selectedId} todayId={todayId} onPick={onPick} />
        <Group label="CORONILLAS" items={coronillas} selectedId={selectedId} todayId={todayId} onPick={onPick} />
      </motion.div>
    </motion.div>
  );
}

function Group({
  label,
  items,
  selectedId,
  todayId,
  onPick,
}: {
  label: string;
  items: { id: string; title: string; subtitle: string }[];
  selectedId: string;
  todayId: string;
  onPick: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="mb-2 text-[10px] font-semibold tracking-[0.22em] text-white/35">{label}</div>
      <div className="space-y-2">
        {items.map((d) => {
          const selected = selectedId === d.id;
          const isToday = d.id === todayId;
          return (
            <button
              key={d.id}
              onClick={() => onPick(d.id)}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-[var(--gold)] bg-[var(--gold)]/10"
                  : isToday
                    ? "border-[var(--gold)]/35 bg-white/[0.04]"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
              }`}
            >
              <span className="text-lg">{ROSARIO_IDS.has(d.id) ? "📿" : "✨"}</span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-semibold ${selected ? "text-[var(--gold)]" : "text-white"}`}>
                  {d.title}
                </span>
                <span className="block truncate text-[11px] text-white/45">{d.subtitle}</span>
              </span>
              {isToday && (
                <span className="shrink-0 rounded-full bg-[var(--gold)] px-2 py-0.5 text-[9px] font-bold tracking-wider text-black">
                  HOY
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
