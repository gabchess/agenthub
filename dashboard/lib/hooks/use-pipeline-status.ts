import useSWR from "swr";
import { apiKey } from "../api";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePipelineStatus() {
  const { data, error, isLoading } = useSWR(
    apiKey("/api/pipeline/status"),
    fetcher,
    { refreshInterval: 2000 }
  );

  return {
    statuses: data ?? [],
    error,
    isLoading,
  };
}
