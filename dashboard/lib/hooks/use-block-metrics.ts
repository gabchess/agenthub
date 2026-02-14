import useSWR from "swr";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_BLOCKS } from "../demo-data";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBlockMetrics(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    apiKey(`/api/pipeline/blocks?limit=${limit}`),
    fetcher,
    { refreshInterval: 2000 }
  );

  return {
    blocks: data ?? (API_CONFIGURED ? [] : DEMO_BLOCKS),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
