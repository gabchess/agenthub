import useSWR from "swr";
import { POLL_TRACES } from "../constants";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_TRACES } from "../demo-data";
import type { Trace } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTraces(filters?: {
  run_id?: string;
  step_id?: string;
  agent_id?: string;
  trace_type?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.run_id) params.set("run_id", filters.run_id);
  if (filters?.step_id) params.set("step_id", filters.step_id);
  if (filters?.agent_id) params.set("agent_id", filters.agent_id);
  if (filters?.trace_type) params.set("trace_type", filters.trace_type);
  if (filters?.limit) params.set("limit", String(filters.limit));

  const query = params.toString();
  const { data, error, isLoading, mutate } = useSWR<Trace[]>(
    apiKey(`/api/traces${query ? `?${query}` : ""}`),
    fetcher,
    { refreshInterval: POLL_TRACES }
  );

  // Filter demo data client-side when API is not configured
  let fallback = DEMO_TRACES;
  if (!API_CONFIGURED && filters) {
    if (filters.run_id) fallback = fallback.filter((t) => t.run_id === filters.run_id);
    if (filters.agent_id) fallback = fallback.filter((t) => t.agent_id === filters.agent_id);
    if (filters.trace_type) fallback = fallback.filter((t) => t.trace_type === filters.trace_type);
    if (filters.limit) fallback = fallback.slice(0, filters.limit);
  }

  return {
    traces: data ?? (API_CONFIGURED ? [] : fallback),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
