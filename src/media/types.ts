export type WhatsAppTag =
  | "laudes"
  | "angelus"
  | "evangelio"
  | "salmo"
  | "reflexion"
  | "canto";

export interface WhatsAppAsset {
  id: string;
  tag: WhatsAppTag;
  title: string;
  author: string;
  duration: number;
  uploadedAt: string;
  source: "whatsapp";
  audioUrl?: string;
  transcript?: string;
  featured?: boolean;
}
