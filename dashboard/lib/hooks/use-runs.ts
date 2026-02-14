import useSWR from "swr";
import { POLL_RUNS_LIST } from "../constants";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_RUNS } from "../demo-data";
import type { Run } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRuns(workflowId?: string) {
  const params = workflowId ? `?workflow=${workflowId}` : "";
  const { data, error, isLoading, mutate } = useSWR<Run[]>(
    apiKey(`/api/runs${params}`),
    fetcher,
    { refreshInterval: POLL_RUNS_LIST }
  );

  const fallback = workflowId
    ? DEMO_RUNS.filter((r) => r.workflow_id === workflowId)
    : DEMO_RUNS;

  return {
    runs: data ?? (API_CONFIGURED ? [] : fallback),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
