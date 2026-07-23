import { useEffect, useRef, useState } from "react";
import { useRosario } from "../engine/useRosario";
import { Lobby } from "./rosario/Lobby";
import { LiveSession } from "./rosario/LiveSession";
import { IntentionPrompt } from "./rosario/IntentionPrompt";
import { useSpiritual } from "../fruits/store";
import { useRosaryLobbyData } from "../rosary/useRosaryLobbyData";

export function RosarioScreen({
  onOpenGallery,
  onActiveChange,
}: {
  onOpenGallery?: () => void;
  onActiveChange?: (active: boolean) => void;
}) {
  const rosario = useRosario();
  const { emit, lightCandle, activeIntentions, candles } = useSpiritual();
  const lobby = useRosaryLobbyData();
  const [pendingStart, setPendingStart] = useState<
    null | "community" | "solo" | "join"
  >(null);

  // Emitir frutos según el resultado del motor (desacoplado del rezo).
  const prevStatus = useRef(rosario.state.status);
  const joinedRef = useRef(false);
  useEffect(() => {
    const s = rosario.state.status;
    if (s === "completed" && prevStatus.current !== "completed") {
      emit({ type: "rosary-complete" });
      emit({ type: "daily-streak" });
    }
    if (s === "idle") joinedRef.current = false;
    prevStatus.current = s;
  }, [rosario.state.status, emit]);

  // Al empezar en modo comunidad, se produce Agua (caridad).
  useEffect(() => {
    if (
      rosario.state.status === "running" &&
      rosario.state.mode === "community" &&
      !joinedRef.current
    ) {
      joinedRef.current = true;
      emit({ type: "community-join" });
    }
  }, [rosario.state.status, rosario.state.mode, emit]);

  // Informar a la app cuando el Rosario está activo (para ocultar su navbar).
  const isActivePrayer = rosario.state.status !== "idle";
  useEffect(() => {
    onActiveChange?.(isActivePrayer);
    return () => onActiveChange?.(false);
  }, [isActivePrayer, onActiveChange]);

  const run = (kind: "community" | "solo" | "join") => {
    if (kind === "community") rosario.startCommunity();
    if (kind === "solo") rosario.startSolo();
    if (kind === "join") rosario.joinExisting();
    setPendingStart(null);
  };

  const requestStart = (kind: "community" | "solo" | "join") => {
    // Si ya tienes intenciones activas, entras directo.
    if (activeIntentions.length > 0) run(kind);
    else setPendingStart(kind);
  };

  if (rosario.state.status === "idle") {
    return (
      <>
        <Lobby
          meta={rosario.meta}
          roomActive={lobby.data.roomActive}
          peopleNow={lobby.data.peopleNow}
          metrics={lobby.data}
          loading={lobby.loading}
          onStartCommunity={() => requestStart("community")}
          onStartSolo={() => requestStart("solo")}
          onJoin={() => requestStart("join")}
          onOpenGallery={onOpenGallery}
        />
        {pendingStart && (
          <IntentionPrompt
            existing={activeIntentions.map((c) => c.intention)}
            onConfirm={(intention) => {
              if (intention) lightCandle(intention);
              run(pendingStart);
            }}
            onSkip={() => run(pendingStart)}
          />
        )}
      </>
    );
  }

  // En el Rosario Comunitario se sostienen las intenciones de TODA la sala,
  // no solo las seleccionadas por este usuario.
  const communityIntentions = candles
    .filter((c) => c.expiresAt > Date.now())
    .map((c) => c.intention);

  return (
    <LiveSession
      rosario={rosario}
      intentions={communityIntentions}
      onOpenGallery={onOpenGallery}
    />
  );
}
