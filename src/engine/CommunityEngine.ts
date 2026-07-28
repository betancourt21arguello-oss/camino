// ============================================================
//  COMMUNITY ENGINE
//  Presencia, latidos (heartbeat) y asignación automática de rol.
//  El Rosario JAMÁS se detiene: si el líder desaparece, se reasigna.
//  Lógica de comunidad SEPARADA de la máquina de estados del rezo.
// ============================================================

export interface Member {
  id: number;
  hue: number;
  name: string;
  isMe: boolean;
  lastSeen: number; // heartbeat timestamp (ms)
  lastInteractionAt: number; // 🙏 / respuesta real
  doneForStep: boolean;
}

export const ME_ID = 1;
const LEADER_DROP_MS = 10000;
const INACTIVE_MS = 10000;

export class CommunityEngine {
  members: Member[] = [];
  leaderId: number | null = null;
  private rotation = 0;

  reset() {
    this.members = [];
    this.leaderId = null;
    this.rotation = 0;
  }

  /** El usuario entra a la sala mundial. */
  join(isMe = false, seed = 0): Member {
    const id = isMe ? ME_ID : 1000 + this.members.length + seed;
    const m: Member = {
      id,
      hue: (id * 47) % 360,
      name: isMe ? "Tú" : `Participante ${id}`,
      isMe,
      lastSeen: Date.now(),
      lastInteractionAt: Date.now(),
      doneForStep: false,
    };
    this.members.push(m);
    if (this.leaderId == null) this.leaderId = m.id;
    return m;
  }

  leave(id: number) {
    this.members = this.members.filter((m) => m.id !== id);
    if (this.leaderId === id) this.reassignLeader();
  }

  /** Un miembro sigue presente. */
  heartbeat(id: number) {
    const m = this.members.find((x) => x.id === id);
    if (m) m.lastSeen = Date.now();
  }

  /** Quita a quien perdió el latido y, si era líder, reasigna. */
  pruneAndKeepLeaderAlive() {
    const now = Date.now();
    const dropped = this.members.filter((m) => now - m.lastSeen > LEADER_DROP_MS);
    if (dropped.length) {
      this.members = this.members.filter(
        (m) => now - m.lastSeen <= LEADER_DROP_MS,
      );
      if (this.leaderId != null && !this.members.some((m) => m.id === this.leaderId)) {
        this.reassignLeader();
      }
    }
  }

  /** Inactivos >10s no bloquean consenso ni liderazgo, pero siguen presentes. */
  activeMembers() {
    const threshold = Date.now() - INACTIVE_MS;
    return this.members.filter((m) => m.lastInteractionAt >= threshold || m.doneForStep);
  }

  /** Al empezar un Step nuevo, el turno rota. Nunca el mismo siempre. */
  assignLeader() {
    const eligible = this.activeMembers();
    if (eligible.length === 0) {
      this.leaderId = null;
      return;
    }
    this.rotation = (this.rotation + 1) % eligible.length;
    this.leaderId = eligible[this.rotation].id;
    this.members.forEach((m) => (m.doneForStep = false));
  }

  reassignLeader() {
    const eligible = this.activeMembers();
    if (eligible.length === 0) {
      this.leaderId = null;
      return;
    }
    this.rotation = this.rotation % eligible.length;
    this.leaderId = eligible[this.rotation].id;
  }

  markDone(id: number) {
    const m = this.members.find((x) => x.id === id);
    if (m) {
      m.doneForStep = true;
      m.lastInteractionAt = Date.now();
    }
  }

  clearDone() {
    this.members.forEach((m) => (m.doneForStep = false));
  }

  completedRatio(): number {
    const active = this.activeMembers();
    if (active.length === 0) return 0;
    return active.filter((m) => m.doneForStep).length / active.length;
  }

  leaderDone(): boolean {
    if (this.leaderId == null) return false;
    const l = this.members.find((m) => m.id === this.leaderId);
    return !!l?.doneForStep;
  }

  get count() {
    return this.members.length;
  }

  get leaderIsMe() {
    return this.leaderId === ME_ID;
  }
}
