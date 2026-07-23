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
  doneForStep: boolean;
}

const NAMES = [
  "María",
  "Juan",
  "Carlos",
  "Pedro",
  "Ana",
  "Lucía",
  "José",
  "Rosa",
  "Marta",
  "Miguel",
  "Elena",
  "Diego",
  "Sofía",
  "Pablo",
];

export const ME_ID = 1;
const LEADER_DROP_MS = 5000; // 5s sin latido → nuevo líder

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
      name: isMe ? "Tú" : NAMES[(id + seed) % NAMES.length],
      isMe,
      lastSeen: Date.now(),
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

  /** Al empezar un Step nuevo, el turno rota. Nunca el mismo siempre. */
  assignLeader() {
    if (this.members.length === 0) {
      this.leaderId = null;
      return;
    }
    this.rotation = (this.rotation + 1) % this.members.length;
    this.leaderId = this.members[this.rotation].id;
    this.members.forEach((m) => (m.doneForStep = false));
  }

  reassignLeader() {
    if (this.members.length === 0) {
      this.leaderId = null;
      return;
    }
    this.rotation = this.rotation % this.members.length;
    this.leaderId = this.members[this.rotation].id;
  }

  markDone(id: number) {
    const m = this.members.find((x) => x.id === id);
    if (m) m.doneForStep = true;
  }

  clearDone() {
    this.members.forEach((m) => (m.doneForStep = false));
  }

  completedRatio(): number {
    if (this.members.length === 0) return 0;
    return this.members.filter((m) => m.doneForStep).length / this.members.length;
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
