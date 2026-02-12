import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBalanceSnapshots(limit = 50) {
  const { data, error, isLoading, mutate } = useSWR(
    `http://localhost:3333/api/pipeline/balances?limit=${limit}`,
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
