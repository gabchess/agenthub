import useSWR from "swr";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_BALANCES } from "../demo-data";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBalanceSnapshots(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    apiKey(`/api/pipeline/balances?limit=${limit}`),
    fetcher,
    { refreshInterval: 10000 }
  );

  return {
    balances: data ?? (API_CONFIGURED ? [] : DEMO_BALANCES),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
