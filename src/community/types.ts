import type { GardenSeason } from "../garden/types";

/** Forma mínima que cada usuario aporta. Nunca el jardín completo. */
export type SignatureShape =
  | "leaf"
  | "flower"
  | "branch"
  | "star"
  | "arc"
  | "petal";

/**
 * Payload < 100 bytes por participante. Es lo único que se publica
 * en la sala. El SVG se reconstruye en cada cliente.
 */
export interface CommunitySignaturePayload {
  sessionId: string;
  memberId: string;
  signatureSeed: string;
  primaryShape: SignatureShape;
  palette: number;
  countryColor: number;
  growthFactor: number;
}

export type CompositionKind =
  | "manto"
  | "rosa-mistica"
  | "rosario"
  | "paloma"
  | "estrella-mar"
  | "monograma";

export interface CommunityWorkSeed {
  id: string;
  sessionId: string;
  composition: CompositionKind;
  season: GardenSeason;
  communitySeed: string;
  signatures: CommunitySignaturePayload[];
  participants: number;
  intentions: number;
  aveMarias: number;
  completedAt: number;
  title: string;
  intentionTheme: string;
}

export interface CommunityParticle {
  id: string;
  x: number;
  y: number;
  shape: SignatureShape;
  hue: number;
  scale: number;
  delay: number;
  layer: number;
}
