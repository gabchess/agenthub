import { clsx } from "clsx";

export function GlowCard({
  children,
  className,
  glow = false,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={clsx(
        "bg-surface border border-border rounded-lg p-4",
        glow && "glow-green border-accent-green/20",
        className
      )}
    >
      {children}
    </div>
  );
}
