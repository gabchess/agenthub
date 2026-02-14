import useSWR from "swr";
import { POLL_RUNS_LIST } from "../constants";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_AGENT_XP } from "../demo-data";
import type { AgentXp } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useAgentXp() {
  const { data, error, isLoading, mutate } = useSWR<AgentXp[]>(
    apiKey("/api/agents/xp"),
    fetcher,
    { refreshInterval: POLL_RUNS_LIST }
  );

  return {
    agentXp: data ?? (API_CONFIGURED ? [] : DEMO_AGENT_XP),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
