import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePipelineStatus() {
  const { data, error, isLoading } = useSWR(
    "http://localhost:3333/api/pipeline/status",
    fetcher,
    { refreshInterval: 2000 }
  );

  return {
    statuses: data ?? [],
    error,
    isLoading,
  };
}
