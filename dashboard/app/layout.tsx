"use client";

import "./globals.css";
import { SWRConfig } from "swr";
import { Shell } from "@/components/layout/shell";
import { ErrorBoundary } from "@/components/ui/error-boundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>AgentHub Dashboard</title>
        <meta name="description" content="AgentHub — AI Agent Orchestration Platform for Monad" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='0.9em' font-size='90'>&#x2B22;</text></svg>" />
      </head>
      <body className="bg-page min-h-screen">
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            shouldRetryOnError: false,
          }}
        >
          <ErrorBoundary>
            <Shell>{children}</Shell>
          </ErrorBoundary>
        </SWRConfig>
      </body>
    </html>
  );
}
