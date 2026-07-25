export const THEOLOGICAL_SOURCES = [
  {
    doc: 'Dei Verbum',
    ref: 'TODO: número y sección — pendiente de verificación pastoral',
    url: 'https://www.vatican.va/archive/hist_councils/ii_vatican_council/documents/vat-ii_const_19651118_dei-verbum_sp.html',
  },
  {
    doc: 'Verbum Domini',
    ref: 'TODO: número y sección — pendiente de verificación pastoral',
    url: 'https://www.vatican.va/content/benedict-xvi/es/apost_exhortations/documents/hf_ben-xvi_exh_20100930_verbum-domini.html',
  },
  {
    doc: 'Catecismo de la Iglesia Católica',
    ref: 'TODO: 115-119, 2708 — pendiente de verificación pastoral',
    url: 'https://www.vatican.va/archive/catechism_sp/index.html',
  },
] as const;

export type TheologicalSource = (typeof THEOLOGICAL_SOURCES)[number];
