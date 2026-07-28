import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { WhatsAppAsset, WhatsAppTag } from "./types";

interface AssetRow {
  id: string;
  tag: string;
  title: string;
  author: string | null;
  duration_seconds: number | null;
  created_at: string;
  public_url: string | null;
  status: string;
}

const allowedTags = new Set<WhatsAppTag>([
  "laudes",
  "angelus",
  "evangelio",
  "salmo",
  "reflexion",
  "canto",
]);

function fromRow(row: AssetRow): WhatsAppAsset | null {
  if (!allowedTags.has(row.tag as WhatsAppTag) || row.status !== "published") {
    return null;
  }
  return {
    id: row.id,
    tag: row.tag as WhatsAppTag,
    title: row.title,
    author: row.author ?? "Comunidad Camino",
    duration: row.duration_seconds ?? 0,
    uploadedAt: row.created_at,
    source: "whatsapp",
    audioUrl: row.public_url ?? undefined,
  };
}

/** Consulta Supabase y escucha INSERT por Realtime, sin datos estáticos. */
export function useWhatsAppAssets() {
  const [assets, setAssets] = useState<WhatsAppAsset[]>([]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;

    client
      .from("assets")
      .select("id,tag,title,author,duration_seconds,created_at,public_url,status")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active || error) return;
        if (!data) return;
        const mapped = (data as AssetRow[])
          .map(fromRow)
          .filter((asset): asset is WhatsAppAsset => asset !== null);
        setAssets(mapped);
      });

    const channel = client
      .channel("dashboard-assets")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "assets" },
        (payload) => {
          const asset = fromRow(payload.new as AssetRow);
          if (!asset) return;
          setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
        },
      )
      .subscribe();

    let broadcastChannel: BroadcastChannel | null = null;
    try {
      broadcastChannel = new BroadcastChannel("camino-assets");
      broadcastChannel.onmessage = () => {
        client
          .from("assets")
          .select("id,tag,title,author,duration_seconds,created_at,public_url,status")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .then(({ data, error }) => {
            if (!active || error || !data) return;
            const mapped = (data as AssetRow[])
              .map(fromRow)
              .filter((asset): asset is WhatsAppAsset => asset !== null);
            setAssets(mapped);
          });
      };
    } catch {
      // BroadcastChannel not supported; rely on realtime only
    }

    return () => {
      active = false;
      void client.removeChannel(channel);
      broadcastChannel?.close();
    };
  }, []);

  return assets;
}
