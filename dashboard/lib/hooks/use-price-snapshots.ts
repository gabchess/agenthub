import useSWR from "swr";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_PRICES } from "../demo-data";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePriceSnapshots(limit = 100) {
  const { data, error, isLoading, mutate } = useSWR(
    apiKey(`/api/pipeline/prices?limit=${limit}`),
    fetcher,
    { refreshInterval: 5000 }
  );

  return {
    prices: data ?? (API_CONFIGURED ? [] : DEMO_PRICES),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
