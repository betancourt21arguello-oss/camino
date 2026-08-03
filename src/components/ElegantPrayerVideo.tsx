import { useState, useEffect, useRef } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import type { TranscriptLine } from "../liturgy/types";

interface ElegantPrayerVideoProps {
  videoId: string;
  transcript?: TranscriptLine[] | null;
}

export function ElegantPrayerVideo({ videoId, transcript }: ElegantPrayerVideoProps) {
  const [currentTime, setCurrentTime] = useState(0);
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const requestRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());

  const opts: YouTubeProps["opts"] = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      modestbranding: 1,
      rel: 0,
      cc_load_policy: 0,
      iv_load_policy: 3,
      controls: 1,
    },
  };

  const updateTime = () => {
    if (player && typeof player.getCurrentTime === "function") {
      setCurrentTime(player.getCurrentTime());
    }
    requestRef.current = requestAnimationFrame(updateTime);
  };

  const onReady: YouTubeProps["onReady"] = (event) => {
    setPlayer(event.target);
    setIsReady(true);
  };

  const onPlay: YouTubeProps["onPlay"] = () => {
    if (requestRef.current === null) {
      requestRef.current = requestAnimationFrame(updateTime);
    }
  };

  const onPause: YouTubeProps["onPause"] = () => {
    if (requestRef.current !== null) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const activeIndex = transcript?.findIndex(
      (line) => currentTime >= line.offset / 1000 && currentTime <= (line.offset + line.duration) / 1000
    );
    if (activeIndex === undefined || activeIndex === -1) return;
    const node = lineRefs.current.get(activeIndex);
    if (node && containerRef.current) {
      const container = containerRef.current;
      const nodeRect = node.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const isOutside =
        nodeRect.top < containerRect.top + 40 ||
        nodeRect.bottom > containerRect.bottom - 40;
      if (isOutside) {
        node.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [currentTime, isReady, transcript]);

  const hasTranscript = Array.isArray(transcript) && transcript.length > 0;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-lg bg-black">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
          className="absolute top-0 left-0 w-full h-full"
        />
      </div>

      {hasTranscript && (
        <div
          ref={containerRef}
          className="px-4 py-6 bg-white rounded-2xl shadow-sm border border-stone-200 max-h-96 overflow-y-auto scroll-smooth"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500 mb-3 text-center">
            Texto de la oración
          </p>
          <div className="space-y-3 text-center">
            {transcript!.map((line, index) => {
              const startSec = line.offset / 1000;
              const endSec = (line.offset + line.duration) / 1000;
              const isReading = isReady && currentTime >= startSec && currentTime <= endSec;

              return (
                <p
                  key={index}
                  ref={(el) => {
                    if (el) lineRefs.current.set(index, el);
                    else lineRefs.current.delete(index);
                  }}
                  className={`
                    transition-all duration-300 ease-in-out font-serif text-lg md:text-xl leading-relaxed
                    ${isReading ? "text-amber-500 scale-[1.03] opacity-100 font-medium" : "text-stone-700 opacity-90 scale-100"}
                  `}
                >
                  {line.text}
                </p>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
