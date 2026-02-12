import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePriceSnapshots(limit = 100) {
  const { data, error, isLoading, mutate } = useSWR(
    `http://localhost:3333/api/pipeline/prices?limit=${limit}`,
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
