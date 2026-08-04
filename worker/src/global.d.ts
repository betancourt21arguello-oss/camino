// ==========================================
// Declaraciones de tipos globales para el Worker de Camino
// ==========================================

// Tipos de Cloudflare Workers (ExecutionContext)
interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

// Declaración del módulo youtube-transcript (no incluye tipos propios)
declare module "youtube-transcript" {
  interface TranscriptLine {
    text: string;
    offset: number;
    duration: number;
  }

  interface TranscriptConfig {
    lang?: string;
    fetch?: typeof fetch;
  }

  export class YoutubeTranscript {
    static fetchTranscript(
      videoId: string,
      config?: TranscriptConfig
    ): Promise<TranscriptLine[]>;
  }
}