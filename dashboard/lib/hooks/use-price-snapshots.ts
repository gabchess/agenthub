import useSWR from "swr";
import { apiKey } from "../api";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePriceSnapshots(limit = 100) {
  const { data, error, isLoading, mutate } = useSWR(
    apiKey(`/api/pipeline/prices?limit=${limit}`),
    fetcher,
    { refreshInterval: 5000 }
  );

  return {
    prices: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
