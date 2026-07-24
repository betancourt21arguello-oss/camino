import { useEffect, useRef, useState } from "react";
import { PrayerEngine } from "./PrayerEngine";
import type { EngineState, FlatStep, Role } from "./types";

export interface RosarioApi {
  state: EngineState;
  current: FlatStep | null;
  myRole: Role;
  leaderId: number | null;
  membersSample: { id: number; hue: number; done: boolean; isMe: boolean }[];
  meta: { title: string; subtitle: string };
  // Events dispatched to the engine (UI never decides advance)
  startCommunity: () => void;
  startSolo: () => void;
  joinExisting: () => void;
  markDone: () => void;
  pause: () => void;
  resume: () => void;
  leave: () => void;
}

import { resolveDevotion } from "./devotions";
import { devotionIdForToday } from "./devotions/rosarioMisterios";

export function useRosario(devotionId: string = devotionIdForToday()): RosarioApi {
  const ref = useRef<PrayerEngine | null>(null);
  const prevDevotionId = useRef(devotionId);

  if (!ref.current || prevDevotionId.current !== devotionId) {
    const devotion = resolveDevotion(devotionId);
    ref.current = new PrayerEngine(devotion);
    prevDevotionId.current = devotionId;
  }
  const engine = ref.current;

  const [, force] = useState(0);

  useEffect(() => {
    const unsub = engine.subscribe(() => force((n) => n + 1));
    return () => {
      unsub();
    };
  }, [engine]);

  useEffect(() => {
    const id = setInterval(() => engine.tick(1), 1000);
    return () => clearInterval(id);
  }, [engine]);

  const membersSample = engine.community.members.slice(0, 50).map((m) => ({
    id: m.id,
    hue: m.hue,
    done: m.doneForStep,
    isMe: m.isMe,
  }));

  return {
    state: engine.getState(),
    current: engine.currentFlat(),
    myRole: engine.myRole(),
    leaderId: engine.community.leaderId,
    membersSample,
    meta: engine.devotionMeta,
    startCommunity: () => engine.startCommunity(),
    startSolo: () => engine.startSolo(),
    joinExisting: () => engine.joinExisting(),
    markDone: () => engine.markDone(),
    pause: () => engine.pause(),
    resume: () => engine.resume(),
    leave: () => engine.leave(),
  };
}
