/**
 * sessionBridge.ts
 *
 * Puente entre Safari (navegador) y la PWA (standalone) en iOS.
 * Ambos comparten el mismo localStorage, así que podemos usarlo
 * para pasar la sesión del magic link del navegador a la app.
 */

const SESSION_KEY = "camino:session";

interface StoredSession {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

export function storeSessionInBridge(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // localStorage no disponible
  }
}

export function getSessionFromBridge(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearSessionBridge(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}