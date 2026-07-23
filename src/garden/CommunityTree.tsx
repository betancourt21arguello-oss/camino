import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { createPrng } from "./prng";
import { GardenSignatureGlyph } from "./GardenSvg";
import type { GardenSignature } from "./types";

type Input = { id: string | number; done: boolean };

interface NodeModel {
  id: string;
  x: number;
  y: number;
  done: boolean;
  signature: GardenSignature;
}

/**
 * El Rosario recibe únicamente firmas compactas. Estas convergen en un árbol
 * comunitario; nunca se transporta ni se renderiza el jardín personal entero.
 */
export const CommunityTree = memo(function CommunityTree({ members }: { members: Input[] }) {
  const nodes = useMemo<NodeModel[]>(
    () =>
      members.slice(0, 30).map((member, index) => {
        const rng = createPrng(`community-signature:${member.id}`);
        const side = index % 2 === 0 ? -1 : 1;
        const level = Math.floor(index / 2);
        return {
          id: String(member.id),
          x: 180 + side * (34 + (level % 5) * 23),
          y: 224 - level * 12 - rng() * 12,
          done: member.done,
          signature: {
            kind: (["leaf", "flower", "branch", "star"] as const)[Math.floor(rng() * 4)],
            hue: 65 + Math.floor(rng() * 65),
            angle: -28 + Math.floor(rng() * 56),
            petals: 4 + Math.floor(rng() * 4),
            code: Math.floor(rng() * 65_535),
          },
        };
      }),
    [members],
  );

  return (
    <svg viewBox="0 0 360 250" className="h-auto w-full" aria-label="Árbol comunitario formado por las firmas de los participantes">
      <defs>
        <radialGradient id="community-glow">
          <stop offset="0" stopColor="#d4af6a" stopOpacity=".32" />
          <stop offset="1" stopColor="#d4af6a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="180" cy="115" rx="130" ry="110" fill="url(#community-glow)" />
      <path d="M180 244 C175 190 184 145 180 72" fill="none" stroke="#746d58" strokeWidth="7" strokeLinecap="round" />
      {nodes.map((node) => (
        <g key={node.id}>
          <path
            d={`M180 ${Math.min(224, node.y + 28)} Q ${180 + (node.x - 180) * 0.4} ${node.y + 12} ${node.x} ${node.y}`}
            fill="none"
            stroke="#7d876d"
            strokeWidth="1.3"
            opacity=".55"
          />
          {node.done && (
            <motion.circle
              cx={node.x}
              cy={node.y}
              r="5"
              fill="none"
              stroke="#d4af6a"
              initial={{ r: 5, opacity: 0.8 }}
              animate={{ r: 24, opacity: 0 }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          <motion.g
            transform={`translate(${node.x} ${node.y})`}
            animate={{ rotate: [-1, 1, -1] }}
            transition={{ duration: 7 + (node.signature.code % 4), repeat: Infinity, ease: "easeInOut" }}
          >
            <GardenSignatureGlyph signature={node.signature} />
          </motion.g>
        </g>
      ))}
      <circle cx="180" cy="78" r="7" fill="#d4af6a" opacity=".8" />
      <motion.circle
        cx="180"
        cy="78"
        r="15"
        fill="none"
        stroke="#d4af6a"
        animate={{ r: [10, 25, 10], opacity: [0.45, 0, 0.45] }}
        transition={{ duration: 5, repeat: Infinity }}
      />
    </svg>
  );
});
