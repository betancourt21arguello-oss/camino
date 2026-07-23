import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import {
  buildCommunityParticles,
  COMPOSITION_LABELS,
} from "./composition";
import type {
  CommunityParticle,
  CommunitySignaturePayload,
  CompositionKind,
  SignatureShape,
} from "./types";

interface Props {
  communitySeed: string;
  composition: CompositionKind;
  signatures: CommunitySignaturePayload[];
  /** 0..1 — crece SOLO con las respuestas 🙏 de la comunidad, no con el tiempo. */
  progress: number;
  complete?: boolean;
  className?: string;
}

export const CommunityWorkSvg = memo(function CommunityWorkSvg({
  communitySeed,
  composition,
  signatures,
  progress,
  complete = false,
  className,
}: Props) {
  const particles = useMemo(
    () => buildCommunityParticles(communitySeed, composition, signatures),
    [communitySeed, composition, signatures],
  );

  const visibleCount = Math.max(
    0,
    Math.floor(particles.length * Math.min(1, Math.max(0, progress))),
  );
  const visible = particles.slice(0, visibleCount);
  const empty = visibleCount === 0;

  return (
    <svg
      viewBox="0 0 360 360"
      className={className ?? "h-auto w-full"}
      role="img"
      aria-label={`Obra comunitaria en formación: ${COMPOSITION_LABELS[composition]}`}
    >
      <defs>
        <radialGradient id="work-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#d4af6a" stopOpacity={complete ? 0.35 : 0.18} />
          <stop offset="1" stopColor="#d4af6a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="360" height="360" fill="#0a0a0b" />
      <ellipse cx="180" cy="175" rx="150" ry="140" fill="url(#work-glow)" />

      {/* Al principio no existe nada. Solo una tenue luz. */}
      {empty && (
        <motion.g
          initial={{ opacity: 0.2 }}
          animate={{ opacity: [0.25, 0.7, 0.25], scale: [0.9, 1.08, 0.9] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "180px 180px" }}
        >
          <circle cx="180" cy="180" r="3" fill="#f0e2b8" />
          <circle cx="180" cy="180" r="14" fill="#d4af6a" opacity=".12" />
          <text
            x="180"
            y="210"
            textAnchor="middle"
            fill="#d4af6a"
            fontSize="10"
            opacity=".55"
            letterSpacing="2"
          >
            ✨
          </text>
        </motion.g>
      )}

      {visible.map((p) => (
        <Particle key={p.id} p={p} />
      ))}

      {complete && (
        <motion.circle
          cx="180"
          cy="175"
          r="20"
          fill="none"
          stroke="#d4af6a"
          initial={{ r: 20, opacity: 0.5 }}
          animate={{ r: [20, 90, 20], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </svg>
  );
});

function Particle({ p }: { p: CommunityParticle }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0, x: 180, y: 180 }}
      animate={{ opacity: 0.85, scale: p.scale, x: p.x, y: p.y }}
      transition={{ duration: 1.4, delay: Math.min(0.4, p.delay * 0.15), ease: "easeOut" }}
    >
      <SignatureMark shape={p.shape} hue={p.hue} />
    </motion.g>
  );
}

function SignatureMark({ shape, hue }: { shape: SignatureShape; hue: number }) {
  const fill = `hsl(${hue} 28% 68%)`;
  const stroke = `hsl(${hue} 22% 48%)`;
  switch (shape) {
    case "leaf":
      return <path d="M-7 4 Q0 -11 8 -3 Q2 8 -7 4Z" fill={fill} opacity=".9" />;
    case "flower":
      return (
        <g>
          {Array.from({ length: 5 }, (_, i) => (
            <ellipse
              key={i}
              cy="-5"
              rx="2.2"
              ry="5"
              fill={fill}
              transform={`rotate(${i * 72})`}
            />
          ))}
          <circle cx="0" cy="0" r="1.8" fill="#c4a35a" />
        </g>
      );
    case "branch":
      return (
        <g>
          <path d="M-8 6 Q0 0 8 -7" fill="none" stroke={stroke} strokeWidth="1.6" />
          <ellipse cx="-1" cy="1" rx="4" ry="2" fill={fill} transform="rotate(25)" />
        </g>
      );
    case "star":
      return (
        <path
          d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2Z"
          fill={fill}
        />
      );
    case "arc":
      return (
        <path
          d="M-8 2 Q0 -8 8 2"
          fill="none"
          stroke={fill}
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      );
    case "petal":
      return <path d="M0 6 Q5 -2 0 -9 Q-5 -2 0 6Z" fill={fill} />;
  }
}
