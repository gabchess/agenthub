import useSWR from "swr";
import { POLL_RUNS_LIST } from "../constants";
import type { Run } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRuns(workflowId?: string) {
  const params = workflowId ? `?workflow=${workflowId}` : "";
  const { data, error, isLoading, mutate } = useSWR<Run[]>(
    `http://localhost:3333/api/runs${params}`,
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
