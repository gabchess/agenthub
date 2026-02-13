import useSWR from "swr";
import { POLL_RUN_DETAIL } from "../constants";
import { apiKey } from "../api";
import type { Run } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useRun(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Run>(
    id ? apiKey(`/api/runs/${id}`) : null,
    fetcher,
    { refreshInterval: POLL_RUN_DETAIL }
  );

  return {
    run: data,
    error,
    isLoading,
    mutate,
  };
}
