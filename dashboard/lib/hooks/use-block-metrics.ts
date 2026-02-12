import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBlockMetrics(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    `http://localhost:3333/api/pipeline/blocks?limit=${limit}`,
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
