// ============================================================
//  PRAYER ENGINE  —  Única máquina de estados.
//  La UI NUNCA modifica Steps. Solo envía eventos y refleja estado.
//  El avance ocurre SOLO por interacción real de usuarios.
//  Nunca por un contador que simplemente aumenta.
// ============================================================

import type { Devotion, EngineState, FlatStep, Mode, Role } from "./types";
import { CommunityEngine, ME_ID } from "./CommunityEngine";

type Listener = () => void;

export class PrayerEngine {
  private devotion: Devotion;
  private flat: FlatStep[] = [];
  readonly community = new CommunityEngine();

  private listeners = new Set<Listener>();

  private status: EngineState["status"] = "idle";
  private mode: Mode = "solo";
  private flatIndex = 0;
  private repeatIndex = 0;
  private stepElapsed = 0;
  private soloDone = false;

  constructor(devotion: Devotion) {
    this.devotion = devotion;
    this.flatten();
  }

  // ---- Loader: aplana el árbol Devotion → Sections → Steps ----------
  private flatten() {
    this.flat = [];
    let mysteryNumber = 0;
    this.devotion.sections.forEach((section, sectionIndex) => {
      if (section.kind === "mystery") mysteryNumber += 1;
      section.steps.forEach((step) => {
        this.flat.push({
          step,
          sectionIndex,
          sectionTitle: section.title,
          sectionKind: section.kind,
          mysteryNumber: section.kind === "mystery" ? mysteryNumber : undefined,
        });
      });
    });
  }

  // ---- Subscription -------------------------------------------------
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  // ---- Public control API ------------------------------------------
  startSolo() {
    this.community.reset();
    this.community.join(true);
    this.mode = "solo";
    this.begin();
  }

  startCommunity() {
    // Sala vacía → tú inicias y eres el primer guía.
    this.community.reset();
    this.community.join(true);
    this.mode = "community";
    this.begin();
  }

  /** Unirse a un Rosario ya en curso (sala con gente). */
  joinExisting(startAtFlat = 0) {
    this.community.reset();
    this.community.join(true); // yo entro también
    this.mode = "community";
    this.flatIndex = Math.min(startAtFlat, this.flat.length - 1);
    this.enterStep(true);
    this.status = "running";
    this.emit();
  }

  private begin() {
    this.flatIndex = 0;
    this.repeatIndex = 0;
    this.stepElapsed = 0;
    this.soloDone = false;
    this.status = "running";
    this.enterStep(true);
    this.emit();
  }

  pause() {
    if (this.status === "running") {
      this.status = "paused";
      this.emit();
    }
  }
  resume() {
    if (this.status === "paused") {
      this.status = "running";
      this.emit();
    }
  }
  leave() {
    this.community.leave(ME_ID);
    this.reset();
  }
  reset() {
    this.status = "idle";
    this.mode = "solo";
    this.flatIndex = 0;
    this.repeatIndex = 0;
    this.stepElapsed = 0;
    this.soloDone = false;
    this.community.reset();
    this.emit();
  }
  private complete() {
    this.status = "completed";
    this.emit();
  }

  // ---- Event from UI: "he terminado" (soltar el gesto 🙏) -----------
  markDone() {
    if (this.status !== "running") return;
    const cur = this.currentFlat();
    if (!cur) return;
    if (this.mode === "solo") {
      this.soloDone = true; // el motor decidirá en el próximo tick
    } else {
      this.community.markDone(ME_ID);
    }
    // Reevaluar de inmediato (el motor decide, no el click)
    if (this.shouldAdvance()) this.advance();
    else this.emit();
  }

  // El reloj solo detecta inactividad/presencia. JAMÁS avanza Steps.
  tick(dt = 1) {
    if (this.status !== "running") return;
    this.stepElapsed += dt;

    if (this.mode === "community") {
      this.community.pruneAndKeepLeaderAlive();
      this.community.heartbeat(ME_ID);
    }
    this.emit();
  }

  // ---- Transition decision (LA MÁQUINA DECIDE) ---------------------
  private shouldAdvance(): boolean {
    const cur = this.currentFlat();
    if (!cur) return false;

    if (this.mode === "solo") {
      return this.soloDone;
    }

    // community
    const byConsensus =
      this.community.completedRatio() >= 0.7;
    const byLeader = this.community.leaderDone();
    return byConsensus || byLeader;
  }

  // ---- Advance (repeat interno o siguiente Step) -------------------
  private advance() {
    const cur = this.currentFlat();
    if (!cur) return;
    const repeat = cur.step.repeat ?? 1;

    if (this.repeatIndex < repeat - 1) {
      this.repeatIndex += 1;
      this.enterIteration();
    } else if (this.flatIndex < this.flat.length - 1) {
      this.flatIndex += 1;
      this.repeatIndex = 0;
      this.enterStep(false);
    } else {
      this.complete();
      return;
    }
    this.emit();
  }

  private enterStep(first: boolean) {
    this.stepElapsed = 0;
    this.soloDone = false;
    if (!first) this.community.assignLeader();
    else this.community.reassignLeader();
  }

  private enterIteration() {
    // Cada Ave María también rota el guía y reinicia el consenso.
    this.stepElapsed = 0;
    this.soloDone = false;
    this.community.assignLeader();
  }

  // ---- Snapshots for the UI ----------------------------------------
  currentFlat(): FlatStep | null {
    return this.flat[this.flatIndex] ?? null;
  }

  myRole(): Role {
    const cur = this.currentFlat();
    if (!cur) return "all";
    if (cur.step.role === "all") return "all";
    return this.community.leaderIsMe ? "leader" : "assembly";
  }

  get devotionMeta() {
    return { title: this.devotion.title, subtitle: this.devotion.subtitle };
  }

  getState(): EngineState {
    const cur = this.currentFlat();
    return {
      status: this.status,
      mode: this.mode,
      flatIndex: this.flatIndex,
      repeatIndex: this.repeatIndex,
      stepElapsed: this.stepElapsed,
      phase: cur?.step.type === "reflection" ? "reflection" : "prayer",
      participants: this.community.count,
      completedRatio: this.community.completedRatio(),
      leaderIsMe: this.community.leaderIsMe,
      soloDone: this.soloDone,
    };
  }
}
