import { YoutubeTranscript } from "youtube-transcript";

export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const videoUrl = body?.videoUrl;

    if (!videoUrl || typeof videoUrl !== "string") {
      return new Response(JSON.stringify({ error: "Missing videoUrl" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl, {
      lang: "es",
    });

    if (!transcript || transcript.length === 0) {
      return new Response(JSON.stringify({ transcript: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const lines = transcript.map((line) => ({
      text: line.text,
      offset: line.offset,
      duration: line.duration,
    }));

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
