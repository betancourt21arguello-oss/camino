import { cn } from "../utils/cn";

type AvatarProps = {
  name: string;
  hue: number;
  size?: number;
  ring?: "none" | "gold" | "active";
  className?: string;
};

export function Avatar({ name, hue, size = 40, ring = "none", className }: AvatarProps) {
  const initials = name.slice(0, 2);
  const bg = `linear-gradient(135deg, hsl(${hue} 45% 62%), hsl(${(hue + 40) % 360} 40% 45%))`;

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full font-medium text-white/90 select-none",
        ring === "gold" && "ring-2 ring-[var(--gold)]",
        ring === "active" && "ring-2 ring-[#e15b5b] shadow-[0_0_10px_rgba(225,91,91,0.6)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.34,
      }}
    >
      {initials}
    </div>
  );
}
