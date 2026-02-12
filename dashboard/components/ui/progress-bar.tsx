import { clsx } from "clsx";

export function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;

  return (
    <div className={clsx("flex items-center gap-2", className)}>
      <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-green rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 font-mono w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}
