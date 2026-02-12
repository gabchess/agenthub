"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type SSEStatus = "connecting" | "connected" | "disconnected";

interface SSEEvent {
  type: string;
  data: unknown;
}

export function useSSE(url: string) {
  const [status, setStatus] = useState<SSEStatus>("disconnected");
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());

  const subscribe = useCallback((eventType: string, handler: (data: unknown) => void) => {
    if (!listenersRef.current.has(eventType)) {
      listenersRef.current.set(eventType, new Set());
    }
    listenersRef.current.get(eventType)!.add(handler);

    return () => {
      listenersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    const es = new EventSource(url);
    eventSourceRef.current = es;
    setStatus("connecting");

    const eventTypes = ["connected", "block", "balance", "price", "contract", "health", "status", "heartbeat"];

    for (const type of eventTypes) {
      es.addEventListener(type, (event) => {
        try {
          const data = JSON.parse(event.data);
          const sseEvent = { type, data };
          setLastEvent(sseEvent);

          const handlers = listenersRef.current.get(type);
          if (handlers) {
            for (const handler of handlers) {
              handler(data);
            }
          }
        } catch {
          // Invalid JSON — skip
        }
      });
    }

    es.addEventListener("connected", () => {
      setStatus("connected");
    });

    es.onerror = () => {
      setStatus("disconnected");
    };

    es.onopen = () => {
      setStatus("connected");
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setStatus("disconnected");
    };
  }, [url]);

  return { status, lastEvent, subscribe };
}
