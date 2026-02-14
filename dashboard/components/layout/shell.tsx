"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 p-6">
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
