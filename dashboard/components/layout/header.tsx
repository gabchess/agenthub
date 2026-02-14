"use client";

import { usePathname } from "next/navigation";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/runs": "Workflow Runs",
  "/agents": "Agent Cards",
  "/traces": "Execution Traces",
  "/wallets": "Wallet Monitor",
  "/pipeline": "Pipeline Health",
};

export function Header() {
  const pathname = usePathname();

  const basePath = "/" + (pathname.split("/")[1] ?? "");
  const title = pageTitles[basePath] ?? "AgentHub";

  return (
    <header className="h-12 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <span className="text-gray-500 text-xs font-mono">$</span>
        <h2 className="text-sm font-medium text-gray-200">{title}</h2>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="font-mono">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
      </div>
    </header>
  );
}
