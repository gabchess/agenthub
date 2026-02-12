import { clsx } from "clsx";
import { ROLE_COLORS } from "@/lib/constants";
import type { AgentRole } from "@/lib/types";

export function RoleBadge({ role }: { role: AgentRole }) {
  const colorClass =
    ROLE_COLORS[role] ?? "text-gray-500 bg-gray-500/10 border-gray-500/30";

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium uppercase tracking-wider",
        colorClass
      )}
    >
      {role}
    </span>
  );
}
