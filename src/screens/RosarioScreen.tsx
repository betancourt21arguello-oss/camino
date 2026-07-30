import { useEffect, useMemo, useRef, useState } from "react";
import { useRosario } from "../engine/useRosario";
import { DEVOTIONS, ROSARIO_IDS } from "../engine/devotions";
import { devotionIdForToday } from "../engine/devotions/rosarioMisterios";
import { Lobby } from "./rosario/Lobby";
import { LiveSession } from "./rosario/LiveSession";
import { IntentionPrompt } from "./rosario/IntentionPrompt";
import { useSpiritual } from "../fruits/store";
import { useActiveRooms, type ActiveRoom } from "../rosary/useActiveRooms";

type Props = {
  onOpenGallery?: () => void;
  onActiveChange?: (active: boolean) => void;
  onOpenHour?: (kind: "laudes" | "vespers" | "compline") => void;
  initialDevotionId?: string;
};

export function RosarioScreen({ onOpenGallery, onActiveChange, onOpenHour, initialDevotionId }: Props) {
  const todayDevotionId = useMemo(() => devotionIdForToday(), []);
  const [selectedDevotionId, setSelectedDevotionId] = useState(initialDevotionId || todayDevotionId);
  const rosario = useRosario(selectedDevotionId);
  const { emit, lightCandle, activeIntentions, candles } = useSpiritual();
  const { rooms, loading: roomsLoading, total: totalPraying } = useActiveRooms();

  const [pendingStart, setPendingStart] = useState<null | "community" | "solo" | "join">(null);

  // Unirse a una sala cuya devoción aún no está cargada requiere esperar a que
  // el motor se reconstruya tras cambiar selectedDevotionId. Lo difiero aquí.
  const pendingJoinRef = useRef(false);
  const prevSelRef = useRef(selectedDevotionId);
  useEffect(() => {
    if (prevSelRef.current !== selectedDevotionId) {
      prevSelRef.current = selectedDevotionId;
      if (pendingJoinRef.current) {
        pendingJoinRef.current = false;
        rosario.joinExisting();
      }
    }
  }, [selectedDevotionId, rosario]);

  // Frutos al completar (desacoplado del motor).
  const prevStatus = useRef(rosario.state.status);
  const joinedRef = useRef(false);
  useEffect(() => {
    const s = rosario.state.status;
    if (s === "completed" && prevStatus.current !== "completed") {
      // Determinar el tipo de evento según la devoción
      const isRosario = selectedDevotionId.startsWith("rosario-");
      const isCoronilla = selectedDevotionId === "divina-misericordia";
      if (isRosario) {
        emit({ type: "rosary-complete" });
      } else if (isCoronilla) {
        emit({ type: "coronilla-complete" });
      } else {
        emit({ type: "novena-complete" });
      }
      emit({ type: "daily-streak" });
    }
    if (s === "idle") joinedRef.current = false;
    prevStatus.current = s;
  }, [rosario.state.status, emit, selectedDevotionId]);

  useEffect(() => {
    if (rosario.state.status === "running" && rosario.state.mode === "community" && !joinedRef.current) {
      joinedRef.current = true;
      emit({ type: "community-join" });
    }
  }, [rosario.state.status, rosario.state.mode, emit]);

  const isActivePrayer = rosario.state.status !== "idle";
  useEffect(() => {
    onActiveChange?.(isActivePrayer);
    return () => onActiveChange?.(false);
  }, [isActivePrayer, onActiveChange]);

  const run = (kind: "community" | "solo" | "join") => {
    if (kind === "community") rosario.startCommunity();
    else if (kind === "solo") rosario.startSolo();
    else rosario.joinExisting();
    setPendingStart(null);
  };

  const requestStart = (kind: "community" | "solo" | "join") => {
    if (activeIntentions.length > 0) run(kind);
    else setPendingStart(kind);
  };

  // Unirse a una sala concreta (rosario, coronilla u hora).
  const handleJoinRoom = (room: ActiveRoom) => {
    if (room.kind === "hour" && room.hourKind) {
      onOpenHour?.(room.hourKind);
      return;
    }
    const same = room.devotionId === selectedDevotionId;
    setSelectedDevotionId(room.devotionId);
    if (activeIntentions.length > 0) {
      if (same) rosario.joinExisting();
      else pendingJoinRef.current = true;
    } else {
      // Sin intención: el prompt se mostrará; al confirmar, run('join') usará
      // el motor ya reconstruido con la devoción de la sala.
      setPendingStart("join");
    }
  };

  if (rosario.state.status === "idle") {
    return (
      <>
        <Lobby
          rooms={rooms}
          roomsLoading={roomsLoading}
          totalPraying={totalPraying}
          onStartCommunity={() => requestStart("community")}
          onStartSolo={() => requestStart("solo")}
          onJoinRoom={handleJoinRoom}
          onOpenGallery={onOpenGallery}
          selectedDevotionId={selectedDevotionId}
          onSelectDevotion={setSelectedDevotionId}
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

  const communityIntentions = candles.filter((c) => new Date(c.expires_at).getTime() > Date.now()).map((c) => c.intention);

  return (
    <LiveSession
      rosario={rosario}
      intentions={communityIntentions}
      onOpenGallery={onOpenGallery}
    />
  );
}

// Reexport para quienes necesiten distinguir rosarios (p. ej. el anillo).
export { ROSARIO_IDS, DEVOTIONS };
