"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { API_CONFIGURED } from "@/lib/api";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6">
          {!API_CONFIGURED && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-accent-amber/5 border border-accent-amber/20 rounded-lg text-[11px] text-accent-amber/70 font-mono">
              <span className="shrink-0">&#9679;</span>
              <span>Demo mode — showing sample data. Set NEXT_PUBLIC_API_URL to connect to a live instance.</span>
            </div>
          )}
          {children}
        </main>
        <footer className="px-6 py-3 border-t border-border/50 flex items-center justify-between text-[10px] text-gray-600 font-mono">
          <span>AgentHub Dashboard &middot; Monad Testnet</span>
          <span>Built for AI agent orchestration</span>
        </footer>
      </div>
    </div>
  );
}
