/**
 * Identidad estable para usuarios anónimos, persistida localmente.
 * Al vincular una cuenta, la identidad pasa a ser auth.uid — el ADN
 * del jardín se deriva de esa identidad, nunca se genera al azar.
 */
export function getAnonIdentity(): string {
  const key = "camino-anon-identity";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = window.crypto.randomUUID ? window.crypto.randomUUID() : `anon-${Date.now()}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}
