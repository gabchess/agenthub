import useSWR from "swr";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_PIPELINE_STATUS } from "../demo-data";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePipelineStatus() {
  const { data, error, isLoading } = useSWR(
    apiKey("/api/pipeline/status"),
    fetcher,
    { refreshInterval: 2000 }
  );

  return {
    statuses: data ?? (API_CONFIGURED ? [] : DEMO_PIPELINE_STATUS),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
  };
}
