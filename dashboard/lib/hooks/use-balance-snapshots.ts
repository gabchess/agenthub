import useSWR from "swr";
import { apiKey } from "../api";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBalanceSnapshots(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    apiKey(`/api/pipeline/balances?limit=${limit}`),
    fetcher,
    { refreshInterval: 10000 }
  );

  return {
    balances: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
