import useSWR from "swr";
import { POLL_RUN_DETAIL } from "../constants";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_RUNS } from "../demo-data";
import type { Run } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRun(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Run>(
    id ? apiKey(`/api/runs/${id}`) : null,
    fetcher,
    { refreshInterval: POLL_RUN_DETAIL }
  );

  const fallback = id ? DEMO_RUNS.find((r) => r.id === id) : undefined;

  return {
    run: data ?? (API_CONFIGURED ? undefined : fallback),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
