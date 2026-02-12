"use client";

import "./globals.css";
import { SWRConfig } from "swr";
import { Shell } from "@/components/layout/shell";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>AgentHub Dashboard</title>
        <meta name="description" content="AgentHub — AI Agent Orchestration Platform" />
      </head>
      <body className="bg-page min-h-screen">
        <SWRConfig
          value={{
            revalidateOnFocus: false,
            shouldRetryOnError: false,
          }}
        >
          <Shell>{children}</Shell>
        </SWRConfig>
      </body>
    </html>
  );
}
