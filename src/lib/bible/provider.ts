export type BibleTextSource = 'api' | 'deeplink' | 'local';

export interface BiblePassage {
  reference: string;
  translation: string;
  text: string;
  contextUrl?: string;
  source: 'api' | 'deeplink' | 'local';
}

const BIBLE_PROVIDER_MODE = (import.meta.env.VITE_BIBLE_PROVIDER as BibleTextSource) || 'deeplink';
const BIBLE_DEEPLINK_BASE = 'https://www.biblegateway.com/passage/?search=';

export async function getBiblePassage(reference: string, translation = 'Biblia de Jerusalén'): Promise<BiblePassage> {
  if (BIBLE_PROVIDER_MODE === 'api') {
    throw new Error('Modo API no configurado aún. Cambiar VITE_BIBLE_PROVIDER a deeplink.');
  }

  if (BIBLE_PROVIDER_MODE === 'local') {
    throw new Error('Modo local sin datos cargados. Cambiar a deeplink.');
  }

  return {
    reference,
    translation,
    text: '',
    contextUrl: `${BIBLE_DEEPLINK_BASE}${encodeURIComponent(reference)}&version=BDJ`,
    source: 'deeplink',
  };
}
