import useSWR from "swr";
import { POLL_RUNS_LIST } from "../constants";
import { API_BASE } from "../api";
import type { Run } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRuns(workflowId?: string) {
  const params = workflowId ? `?workflow=${workflowId}` : "";
  const { data, error, isLoading, mutate } = useSWR<Run[]>(
    `${API_BASE}/api/runs${params}`,
    fetcher,
    { refreshInterval: POLL_RUNS_LIST }
  );

  return {
    runs: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
