import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getDb } from "../db.js";
import { resolveBundledWorkflowsDir } from "../installer/paths.js";
import YAML from "yaml";

import type { RunInfo, StepInfo } from "../installer/status.js";
import { getRunEvents } from "../installer/events.js";

import {
  getAllPipelineStatus,
  getRecentBlockMetrics,
  getRecentPriceSnapshots,
  getRecentBalanceSnapshots,
  getRecentContractEvents,
  migratePipelineTables,
} from "../pipeline/db-pipeline.js";
import { SSEBroadcaster } from "../pipeline/sse-broadcaster.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface WorkflowDef {
  id: string;
  name: string;
  steps: Array<{ id: string; agent: string }>;
}

function loadWorkflows(): WorkflowDef[] {
  const dir = resolveBundledWorkflowsDir();
  const results: WorkflowDef[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const ymlPath = path.join(dir, entry.name, "workflow.yml");
      if (!fs.existsSync(ymlPath)) continue;
      const parsed = YAML.parse(fs.readFileSync(ymlPath, "utf-8"));
      results.push({
        id: parsed.id ?? entry.name,
        name: parsed.name ?? entry.name,
        steps: (parsed.steps ?? []).map((s: any) => ({ id: s.id, agent: s.agent })),
      });
    }
  } catch { /* empty */ }
  return results;
}

function getRuns(workflowId?: string): Array<RunInfo & { steps: StepInfo[] }> {
  const db = getDb();
  const runs = workflowId
    ? db.prepare("SELECT * FROM runs WHERE workflow_id = ? ORDER BY created_at DESC").all(workflowId) as RunInfo[]
    : db.prepare("SELECT * FROM runs ORDER BY created_at DESC").all() as RunInfo[];
  return runs.map((r) => {
    const steps = db.prepare("SELECT * FROM steps WHERE run_id = ? ORDER BY step_index ASC").all(r.id) as StepInfo[];
    return { ...r, steps };
  });
}

function getRunById(id: string): (RunInfo & { steps: StepInfo[] }) | null {
  const db = getDb();
  const run = db.prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunInfo | undefined;
  if (!run) return null;
  const steps = db.prepare("SELECT * FROM steps WHERE run_id = ? ORDER BY step_index ASC").all(run.id) as StepInfo[];
  return { ...run, steps };
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function serveHTML(res: http.ServerResponse) {
  const htmlPath = path.join(__dirname, "index.html");
  // In dist, index.html won't exist—serve from src
  const srcHtmlPath = path.resolve(__dirname, "..", "..", "src", "server", "index.html");
  const filePath = fs.existsSync(htmlPath) ? htmlPath : srcHtmlPath;
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(fs.readFileSync(filePath, "utf-8"));
}

// Shared SSE broadcaster for pipeline events
let _sseBroadcaster: SSEBroadcaster | null = null;

export function getDashboardBroadcaster(): SSEBroadcaster {
  if (!_sseBroadcaster) {
    _sseBroadcaster = new SSEBroadcaster();
    _sseBroadcaster.start();
  }
  return _sseBroadcaster;
}

export function startDashboard(port = 3333): http.Server {
  // Ensure pipeline tables exist
  try { migratePipelineTables(); } catch { /* tables may already exist */ }

  const broadcaster = getDashboardBroadcaster();

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const p = url.pathname;

    // --- Pipeline API routes ---

    if (p === "/api/pipeline/status") {
      try {
        return json(res, getAllPipelineStatus());
      } catch {
        return json(res, []);
      }
    }

    if (p === "/api/pipeline/blocks") {
      try {
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
        return json(res, getRecentBlockMetrics(limit));
      } catch {
        return json(res, []);
      }
    }

    if (p === "/api/pipeline/prices") {
      try {
        const token = url.searchParams.get("token") ?? undefined;
        const chain = url.searchParams.get("chain") ?? undefined;
        const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);
        return json(res, getRecentPriceSnapshots(token, chain, limit));
      } catch {
        return json(res, []);
      }
    }

    if (p === "/api/pipeline/balances") {
      try {
        const address = url.searchParams.get("address") ?? undefined;
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
        return json(res, getRecentBalanceSnapshots(address, limit));
      } catch {
        return json(res, []);
      }
    }

    if (p === "/api/pipeline/contracts") {
      try {
        const address = url.searchParams.get("address") ?? undefined;
        const method = url.searchParams.get("method") ?? undefined;
        const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
        return json(res, getRecentContractEvents(address, method, limit));
      } catch {
        return json(res, []);
      }
    }

    if (p === "/api/pipeline/stream") {
      broadcaster.addClient(res);
      return;
    }

    // --- Existing routes ---

    if (p === "/api/workflows") {
      return json(res, loadWorkflows());
    }

    const eventsMatch = p.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (eventsMatch) {
      return json(res, getRunEvents(eventsMatch[1]));
    }

    const storiesMatch = p.match(/^\/api\/runs\/([^/]+)\/stories$/);
    if (storiesMatch) {
      const db = getDb();
      const stories = db.prepare(
        "SELECT * FROM stories WHERE run_id = ? ORDER BY story_index ASC"
      ).all(storiesMatch[1]);
      return json(res, stories);
    }

    const runMatch = p.match(/^\/api\/runs\/(.+)$/);
    if (runMatch) {
      const run = getRunById(runMatch[1]);
      return run ? json(res, run) : json(res, { error: "not found" }, 404);
    }

    if (p === "/api/runs") {
      const wf = url.searchParams.get("workflow") ?? undefined;
      return json(res, getRuns(wf));
    }

    // Serve fonts
    if (p.startsWith("/fonts/")) {
      const fontName = path.basename(p);
      const fontPath = path.resolve(__dirname, "..", "..", "assets", "fonts", fontName);
      const srcFontPath = path.resolve(__dirname, "..", "..", "src", "..", "assets", "fonts", fontName);
      const resolvedFont = fs.existsSync(fontPath) ? fontPath : srcFontPath;
      if (fs.existsSync(resolvedFont)) {
        res.writeHead(200, { "Content-Type": "font/woff2", "Cache-Control": "public, max-age=31536000", "Access-Control-Allow-Origin": "*" });
        return res.end(fs.readFileSync(resolvedFont));
      }
    }

    // Serve logo
    if (p === "/logo.jpeg") {
      const logoPath = path.resolve(__dirname, "..", "..", "assets", "logo.jpeg");
      const srcLogoPath = path.resolve(__dirname, "..", "..", "src", "..", "assets", "logo.jpeg");
      const resolvedLogo = fs.existsSync(logoPath) ? logoPath : srcLogoPath;
      if (fs.existsSync(resolvedLogo)) {
        res.writeHead(200, { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" });
        return res.end(fs.readFileSync(resolvedLogo));
      }
    }

    // Serve frontend
    serveHTML(res);
  });

  server.listen(port, () => {
    console.log(`Antfarm Dashboard: http://localhost:${port}`);
  });

  return server;
}
