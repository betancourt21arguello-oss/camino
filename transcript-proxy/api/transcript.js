const YOUTUBE_API_KEY = "AIzaSyAUculbjLh7F4sgHLRGW02yVLD-F7iT4SM";

async function getCaptionId(videoId) {
  const url = `https://www.googleapis.com/youtube/v3/captions?videoId=${encodeURIComponent(videoId)}&key=${encodeURIComponent(YOUTUBE_API_KEY)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube captions list failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  const item = data?.items?.[0];
  if (!item?.id) return null;
  return item.id;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const videoUrl = body?.videoUrl;

    if (!videoUrl || typeof videoUrl !== "string") {
      return new Response(JSON.stringify({ error: "Missing videoUrl" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[Transcript Proxy] Fetching transcript for:", videoUrl);

    const match = videoUrl.match(/[?&]v=([^&]+)/);
    const videoId = match ? match[1] : null;
    if (!videoId) {
      return new Response(JSON.stringify({ transcript: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const captionId = await getCaptionId(videoId);
    console.log("[Transcript Proxy] captionId:", captionId);

    const htmlRes = await fetch(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    console.log("[Transcript Proxy] HTML status:", htmlRes.status);

    if (!htmlRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to fetch video page" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const html = await htmlRes.text();
    const ytMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+meta|<\/script>)/s);

    if (!ytMatch) {
      console.log("[Transcript Proxy] ytInitialPlayerResponse not found");
      return new Response(JSON.stringify({ transcript: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = JSON.parse(ytMatch[1]);
    const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log("[Transcript Proxy] HTML captionTracks:", tracks?.length ?? 0);

    if (!Array.isArray(tracks) || tracks.length === 0) {
      return new Response(JSON.stringify({ transcript: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const esTrack = tracks.find((t) => (t.languageCode || "").startsWith("es")) || tracks[0];
    console.log("[Transcript Proxy] Using track:", esTrack.languageCode, esTrack.kind, esTrack.baseUrl?.slice(0, 80));

    const xmlRes = await fetch(esTrack.baseUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-419,es;q=0.9,en;q=0.8",
        "Referer": "https://www.youtube.com/",
        "Origin": "https://www.youtube.com",
      },
    });

    console.log("[Transcript Proxy] XML status:", xmlRes.status);

    if (!xmlRes.ok) {
      return new Response(JSON.stringify({ transcript: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const xml = await xmlRes.text();
    console.log("[Transcript Proxy] XML length:", xml.length);
    console.log("[Transcript Proxy] XML sample:", xml.slice(0, 300));

    const lines = [];
    const regex = /<text[^>]+start="([^"]+)"[^>]+dur="([^"]+)"[^>]*>([^<]*)<\/text>/g;
    let m;
    while ((m = regex.exec(xml)) !== null) {
      lines.push({
        text: m[3],
        offset: parseFloat(m[1]),
        duration: parseFloat(m[2]),
      });
    }

    console.log("[Transcript Proxy] Parsed lines:", lines.length);

    if (lines.length === 0) {
      return new Response(JSON.stringify({ transcript: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ transcript: lines }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Transcript Proxy] Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
