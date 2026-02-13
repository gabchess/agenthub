"use client";

import { clsx } from "clsx";
import { LEVEL_COLORS, LEVEL_GLOWS } from "@/lib/constants";

export function LevelBadge({ level, name }: { level: number; name: string }) {
  const colorClass =
    LEVEL_COLORS[level] ?? "text-gray-500 bg-gray-500/10 border-gray-500/30";
  const glowClass = LEVEL_GLOWS[level] ?? "";

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-mono tracking-wider",
        colorClass,
        glowClass
      )}
    >
      Lv.{level} {name}
    </span>
  );
}
