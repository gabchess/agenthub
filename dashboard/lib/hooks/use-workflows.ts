import useSWR from "swr";
import { POLL_WORKFLOWS } from "../constants";
import { apiKey } from "../api";
import type { Workflow } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useWorkflows() {
  const { data, error, isLoading, mutate } = useSWR<Workflow[]>(
    apiKey("/api/workflows"),
    fetcher,
    { refreshInterval: POLL_WORKFLOWS }
  );

  return {
    workflows: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
