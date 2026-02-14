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

  // For /runs/[id] subpages, show breadcrumb-style
  const isSubPage = pathname.split("/").length > 2;

  return (
    <header className="h-12 border-b border-border bg-surface/50 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <span className="text-gray-500 text-xs font-mono">$</span>
        <h2 className="text-sm font-medium text-gray-200">{title}</h2>
        {isSubPage && (
          <>
            <span className="text-gray-600 text-xs">/</span>
            <span className="text-accent-green text-xs font-mono">
              {pathname.split("/").pop()?.slice(0, 8)}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-600">
        <span className="px-2 py-0.5 rounded border border-accent-purple/20 text-accent-purple/60 text-[10px] uppercase tracking-wider">
          Monad Testnet
        </span>
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
