import useSWR from "swr";
import { API_BASE } from "../api";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBlockMetrics(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    `${API_BASE}/api/pipeline/blocks?limit=${limit}`,
    fetcher,
    { refreshInterval: 2000 }
  );

  return {
    blocks: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
