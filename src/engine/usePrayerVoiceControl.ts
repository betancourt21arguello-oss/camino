import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in default TS libs).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, " ");
}

/**
 * Verifica si el texto transcrito contiene un porcentaje suficiente de las
 * palabras clave esperadas del paso actual (por defecto, >= 60%).
 */
export function matchKeywords(
  transcript: string,
  keywords: string[],
  threshold = 0.6,
): boolean {
  if (keywords.length === 0) return false;
  const spoken = normalize(transcript);
  const hits = keywords.filter((kw) => spoken.includes(normalize(kw))).length;
  return hits / keywords.length >= threshold;
}

export interface VoiceControlApi {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
  toggle: () => void;
  start: () => void;
  stop: () => void;
}

/**
 * Autoplay por voz. Escucha en continuo, y cuando el texto reconocido
 * cubre suficientes palabras clave del paso actual, llama onComplete()
 * para avanzar y reinicia el reconocedor para el siguiente paso.
 */
export function usePrayerVoiceControl(
  expectedKeywords: string[],
  onComplete: () => void,
): VoiceControlApi {
  const Ctor = getRecognitionCtor();
  const supported = !!Ctor;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const keywordsRef = useRef(expectedKeywords);
  const completeRef = useRef(onComplete);
  const wantListeningRef = useRef(false);
  const firedRef = useRef(false);

  useEffect(() => {
    keywordsRef.current = expectedKeywords;
    firedRef.current = false; // new step → allow a new match
    setTranscript("");
  }, [expectedKeywords]);

  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    recognitionRef.current?.abort();
    setListening(false);
  }, []);

  const start = useCallback(() => {
    if (!Ctor) {
      setError("Tu navegador no soporta reconocimiento de voz.");
      return;
    }
    setError(null);
    wantListeningRef.current = true;

    const rec = new Ctor();
    rec.lang = "es-ES";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        text += e.results[i][0].transcript + " ";
      }
      setTranscript(text.trim());
      if (!firedRef.current && matchKeywords(text, keywordsRef.current)) {
        firedRef.current = true;
        completeRef.current();
        // Reinicia el reconocedor para el siguiente paso.
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
    };

    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        setError("Permiso de micrófono denegado.");
        wantListeningRef.current = false;
        setListening(false);
      }
    };

    rec.onend = () => {
      if (wantListeningRef.current) {
        // Reinicia automáticamente para escuchar el siguiente paso.
        firedRef.current = false;
        try {
          rec.start();
        } catch {
          /* ignore double-start */
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("No se pudo iniciar el micrófono.");
    }
  }, [Ctor]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { supported, listening, transcript, error, toggle, start, stop };
}
