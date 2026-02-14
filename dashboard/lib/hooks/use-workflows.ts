import useSWR from "swr";
import { POLL_WORKFLOWS } from "../constants";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_WORKFLOWS } from "../demo-data";
import type { Workflow } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWorkflows() {
  const { data, error, isLoading, mutate } = useSWR<Workflow[]>(
    apiKey("/api/workflows"),
    fetcher,
    { refreshInterval: POLL_WORKFLOWS }
  );

  return {
    workflows: data ?? (API_CONFIGURED ? [] : DEMO_WORKFLOWS),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
