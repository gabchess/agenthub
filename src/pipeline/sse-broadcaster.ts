/**
 * SSE (Server-Sent Events) broadcaster.
 *
 * Manages connected clients and fans out events to all of them.
 * 15s heartbeat keeps connections alive.
 */

import type { ServerResponse } from 'node:http';
import type { SSEEvent } from './types.js';

export class SSEBroadcaster {
  private clients: Map<string, ServerResponse> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private clientCounter = 0;

  start(): void {
    this.heartbeatTimer = setInterval(() => {
      this.broadcast('heartbeat', { ts: Date.now() });
    }, 15000);
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    for (const [id, res] of this.clients) {
      try { res.end(); } catch { /* noop */ }
    }
    this.clients.clear();
  }

  addClient(res: ServerResponse): string {
    const id = `sse-${++this.clientCounter}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'X-Accel-Buffering': 'no',
    });

    // Send connected event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id })}\n\n`);

    this.clients.set(id, res);

    res.on('close', () => {
      this.clients.delete(id);
    });

    return id;
  }

  broadcast(eventType: SSEEvent['type'], data: unknown): void {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const [id, res] of this.clients) {
      try {
        res.write(payload);
      } catch {
        // Client disconnected — clean up
        this.clients.delete(id);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}
