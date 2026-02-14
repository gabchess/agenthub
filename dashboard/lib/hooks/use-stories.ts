import useSWR from "swr";
import { POLL_STORIES } from "../constants";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_STORIES } from "../demo-data";
import type { Story } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStories(runId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Story[]>(
    runId ? apiKey(`/api/runs/${runId}/stories`) : null,
    fetcher,
    { refreshInterval: POLL_STORIES }
  );

  const fallback = runId ? (DEMO_STORIES[runId] ?? []) : [];

  return {
    stories: data ?? (API_CONFIGURED ? [] : fallback),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
