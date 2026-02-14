"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { API_BASE } from "@/lib/api";
import { NAV_ITEMS } from "@/lib/constants";
import { usePipelineStatus } from "@/lib/hooks/use-pipeline-status";

type PipelineHealth = "healthy" | "degraded" | "down" | "unknown";

function usePipelineHealth(): PipelineHealth {
  const { statuses, isLoading, error } = usePipelineStatus();

  if (isLoading || error || !statuses || statuses.length === 0) return "unknown";

  const running = statuses.filter((s: { status: string }) => s.status === "running").length;
  const total = statuses.length;

  if (running === total) return "healthy";
  if (running > 0) return "degraded";
  return "down";
}

const HEALTH_DOT_CLASSES: Record<PipelineHealth, string> = {
  healthy: "bg-accent-green animate-pulse",
  degraded: "bg-accent-amber",
  down: "bg-accent-red",
  unknown: "bg-gray-600",
};

const icons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  play: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    </svg>
  ),
  activity: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  wallet: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  pipeline: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
};

export function Sidebar() {
  const pathname = usePathname();
  const pipelineHealth = usePipelineHealth();

  return (
    <aside className="w-56 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0">
      <div className="p-4 border-b border-border">
        <h1 className="text-accent-green font-bold text-lg text-glow-green tracking-tight flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="shrink-0">
            <path d="M12 2L21.196 7.5V18.5L12 24L2.804 18.5V7.5L12 2Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" fillOpacity="0.1" />
            <circle cx="12" cy="13" r="3" fill="currentColor" fillOpacity="0.6" />
            <line x1="12" y1="10" x2="12" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="12" y1="16" x2="12" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9.4" y1="11.5" x2="5.5" y2="9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="14.6" y1="14.5" x2="18.5" y2="16.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="14.6" y1="11.5" x2="18.5" y2="9.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="9.4" y1="14.5" x2="5.5" y2="16.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          AgentHub
        </h1>
        <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-widest">
          Dashboard
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const isPipeline = item.label === "Pipeline";
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-all",
                isActive
                  ? "bg-accent-green/10 text-accent-green glow-green"
                  : "text-gray-500 hover:text-gray-300 hover:bg-raised"
              )}
            >
              {icons[item.icon]}
              {item.label}
              {isPipeline && (
                <span
                  className={clsx(
                    "w-1.5 h-1.5 rounded-full ml-auto shrink-0",
                    HEALTH_DOT_CLASSES[pipelineHealth]
                  )}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
          <span>API: {API_BASE.replace(/^https?:\/\//, '')}</span>
        </div>
      </div>
    </aside>
  );
}
