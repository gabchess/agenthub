import useSWR from "swr";
import { POLL_RUNS_LIST } from "../constants";
import { apiKey } from "../api";
import type { AgentXp } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAgentXp() {
  const { data, error, isLoading, mutate } = useSWR<AgentXp[]>(
    apiKey("/api/agents/xp"),
    fetcher,
    { refreshInterval: POLL_RUNS_LIST }
  );

  return {
    agentXp: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
