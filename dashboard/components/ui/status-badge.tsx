import { clsx } from "clsx";
import { RUN_STATUS_COLORS, STEP_STATUS_COLORS, STORY_STATUS_COLORS } from "@/lib/constants";
import type { RunStatus, StepStatus, StoryStatus } from "@/lib/types";

type BadgeVariant = "run" | "step" | "story";

const colorMaps = {
  run: RUN_STATUS_COLORS,
  step: STEP_STATUS_COLORS,
  story: STORY_STATUS_COLORS,
};

export function StatusBadge({
  status,
  variant = "run",
}: {
  status: string;
  variant?: BadgeVariant;
}) {
  const colors = colorMaps[variant] as Record<string, string>;
  const colorClass = colors[status] ?? "text-gray-500 bg-gray-500/10 border-gray-500/30";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-medium uppercase tracking-wider",
        colorClass
      )}
    >
      {status === "running" && (
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
      )}
      {status}
    </span>
  );
}
