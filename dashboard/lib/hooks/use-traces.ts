import useSWR from "swr";
import { POLL_TRACES } from "../constants";
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
    `/api/traces${query ? `?${query}` : ""}`,
    fetcher,
    { refreshInterval: POLL_TRACES }
  );

  return {
    traces: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
