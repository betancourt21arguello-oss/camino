import type { WhatsAppAsset, WhatsAppTag } from "./types";

export const EMPTY_ASSETS: WhatsAppAsset[] = [];

export function assetsByTag(
  tag: WhatsAppTag,
  assets: WhatsAppAsset[] = EMPTY_ASSETS,
) {
  return assets.filter((asset) => asset.tag === tag);
}

export function formatDuration(total: number) {
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, "0")}`;
}
