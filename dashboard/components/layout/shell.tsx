"use client";

import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { API_CONFIGURED } from "@/lib/api";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-56">
        <Header />
        <main className="p-6">
          {!API_CONFIGURED && (
            <div className="mb-6 bg-surface border border-border rounded-lg p-6 text-center">
              <p className="text-gray-400 text-sm">
                No data available — connect to a local AgentHub instance
              </p>
              <p className="text-gray-600 text-xs mt-2 font-mono">
                Set NEXT_PUBLIC_API_URL or run: agenthub dashboard start
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
