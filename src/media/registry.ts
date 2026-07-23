import type { WhatsAppAsset, WhatsAppTag } from "./types";

// Mock de la tabla assets. En producción llega de Supabase después de que el
// webhook de WhatsApp normaliza el caption: #laudes, #angelus, #evangelio…
export const whatsappAssets: WhatsAppAsset[] = [
  {
    id: "wa-laudes-1",
    tag: "laudes",
    title: "Laudes cantados del martes",
    author: "Monasterio Santa María",
    duration: 714,
    uploadedAt: "2026-07-21T05:40:00Z",
    source: "whatsapp",
    featured: true,
  },
  {
    id: "wa-angelus-1",
    tag: "angelus",
    title: "Ángelus del mediodía",
    author: "Padre José",
    duration: 192,
    uploadedAt: "2026-07-21T10:20:00Z",
    source: "whatsapp",
    featured: true,
  },
  {
    id: "wa-gospel-1",
    tag: "evangelio",
    title: "Evangelio leído por el Padre Carlos",
    author: "Padre Carlos",
    duration: 248,
    uploadedAt: "2026-07-21T06:05:00Z",
    source: "whatsapp",
    transcript: "El que haga la voluntad de mi Padre del cielo…",
    featured: true,
  },
  {
    id: "wa-reflection-1",
    tag: "reflexion",
    title: "Pertenecer a la familia de Jesús",
    author: "Hna. Teresa",
    duration: 326,
    uploadedAt: "2026-07-21T06:15:00Z",
    source: "whatsapp",
    featured: true,
  },
  {
    id: "wa-psalm-1",
    tag: "salmo",
    title: "Muéstranos, Señor, tu misericordia",
    author: "Coro Santa Cecilia",
    duration: 205,
    uploadedAt: "2026-07-21T05:55:00Z",
    source: "whatsapp",
  },
];

export function assetsByTag(
  tag: WhatsAppTag,
  assets: WhatsAppAsset[] = whatsappAssets,
) {
  return assets.filter((asset) => asset.tag === tag);
}

export function formatDuration(total: number) {
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}
