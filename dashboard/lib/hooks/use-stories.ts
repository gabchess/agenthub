import useSWR from "swr";
import { POLL_STORIES } from "../constants";
import type { Story } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStories(runId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Story[]>(
    runId ? `http://localhost:3333/api/runs/${runId}/stories` : null,
    fetcher,
    { refreshInterval: POLL_STORIES }
  );

  return {
    stories: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
