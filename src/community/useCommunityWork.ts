import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getAnonIdentity } from "../auth/anonId";
import { useGardenDna } from "../garden/dna";
import type { GardenSeason } from "../garden/types";
import {
  chooseComposition,
  communitySeedFromSession,
  compositionTitle,
  signaturePayloadFromDna,
} from "./composition";
import { saveWork } from "./gallery";
import type {
  CommunitySignaturePayload,
  CommunityWorkSeed,
  CompositionKind,
} from "./types";

interface MemberLite {
  id: number;
  isMe: boolean;
  done: boolean;
}

/**
 * Orquesta la obra comunitaria viva.
 * - Arranca vacía (solo una luz).
 * - Cada 🙏 añade la firma del usuario (y, en mock, algunas firmas compañeras).
 * - El progreso NO avanza por tiempo: avanza por respuestas de la comunidad.
 * - Al completar, guarda CommunitySeed + metadatos (nunca SVG) en la Galería.
 */
export function useCommunityWork({
  active,
  sessionKey,
  members,
  intentionsCount,
  aveMarias,
  season = "ordinary",
  intentionTheme = "paz",
  completed,
}: {
  active: boolean;
  sessionKey: string;
  members: MemberLite[];
  intentionsCount: number;
  aveMarias: number;
  season?: GardenSeason;
  intentionTheme?: string;
  completed: boolean;
}) {
  const { user } = useAuth();
  const identity = useMemo(() => user?.id ?? getAnonIdentity(), [user?.id]);
  const traits = useGardenDna(identity);

  const [signatures, setSignatures] = useState<CommunitySignaturePayload[]>([]);
  const [gestureCount, setGestureCount] = useState(0);
  const [savedWork, setSavedWork] = useState<CommunityWorkSeed | null>(null);
  const seededRef = useRef(false);
  const savedRef = useRef(false);

  // Reset when a new session starts.
  useEffect(() => {
    if (!active) return;
    setSignatures([]);
    setGestureCount(0);
    setSavedWork(null);
    seededRef.current = false;
    savedRef.current = false;
  }, [active, sessionKey]);

  const communitySeed = useMemo(
    () => communitySeedFromSession(sessionKey, signatures),
    [sessionKey, signatures],
  );

  const composition: CompositionKind = useMemo(
    () => chooseComposition(communitySeed || sessionKey, season),
    [communitySeed, sessionKey, season],
  );

  const addSignature = useCallback((payload: CommunitySignaturePayload) => {
    setSignatures((current) => {
      // One signature per member — repeated 🙏 deepen growthFactor instead.
      const existing = current.find((s) => s.memberId === payload.memberId);
      if (existing) {
        return current.map((s) =>
          s.memberId === payload.memberId
            ? {
                ...s,
                growthFactor: Math.min(1.8, s.growthFactor + 0.08),
              }
            : s,
        );
      }
      return [...current, payload];
    });
    setGestureCount((n) => n + 1);
  }, []);

  const offerMyPrayer = useCallback(() => {
    if (!traits) return;
    const me = members.find((m) => m.isMe);
    const payload = signaturePayloadFromDna(
      traits,
      sessionKey,
      me ? String(me.id) : identity,
      1,
    );
    addSignature(payload);

    // Mock de comunidad: otras personas también "responden" con su firma.
    // En producción esto llegaría por Realtime al marcar done.
    const others = members.filter((m) => !m.isMe).slice(0, 3);
    others.forEach((m, i) => {
      window.setTimeout(() => {
        // Synthetic companion signatures derived from member id (stable).
        addSignature({
          sessionId: sessionKey,
          memberId: String(m.id),
          signatureSeed: `m${m.id}`.padEnd(16, "0").slice(0, 16),
          primaryShape: (["leaf", "flower", "branch", "star", "arc", "petal"] as const)[
            m.id % 6
          ],
          palette: m.id % 3,
          countryColor: m.id % 12,
          growthFactor: 0.7 + (i % 3) * 0.15,
        });
      }, 180 + i * 220);
    });
  }, [traits, members, sessionKey, identity, addSignature]);

  // Soft ambient contributions as more people join (still response-driven, not clock).
  useEffect(() => {
    if (!active || members.length === 0 || seededRef.current) return;
    // A very first faint presence when the room has people, without finishing the work.
    if (members.length >= 2) {
      seededRef.current = true;
    }
  }, [active, members.length]);

  // Progress is driven by gestures + unique signatures, never by elapsed time.
  const progress = Math.min(
    1,
    gestureCount * 0.045 + signatures.length * 0.035,
  );

  // Persist the finished work once.
  useEffect(() => {
    if (!completed || savedRef.current) return;
    if (signatures.length === 0 && gestureCount === 0) return;
    savedRef.current = true;
    const title = compositionTitle(composition, intentionTheme, season);
    const work: CommunityWorkSeed = {
      id: `work-${sessionKey}`,
      sessionId: sessionKey,
      composition,
      season,
      communitySeed: communitySeed || sessionKey,
      signatures,
      participants: Math.max(members.length, signatures.length, 1),
      intentions: intentionsCount,
      aveMarias: Math.max(aveMarias, gestureCount * 10),
      completedAt: Date.now(),
      title,
      intentionTheme,
    };
    saveWork(work);
    setSavedWork(work);
  }, [
    completed,
    signatures,
    gestureCount,
    composition,
    intentionTheme,
    season,
    communitySeed,
    sessionKey,
    members.length,
    intentionsCount,
    aveMarias,
  ]);

  return {
    traitsReady: !!traits,
    signatures,
    composition,
    communitySeed: communitySeed || sessionKey,
    progress,
    offerMyPrayer,
    savedWork,
  };
}
