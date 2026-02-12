import useSWR from "swr";
import { POLL_WALLETS } from "../constants";
import type { Trace } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface WalletData {
  traces: Trace[];
}

export function useWallets() {
  const { data, error, isLoading, mutate } = useSWR<WalletData>(
    "/api/wallets",
    fetcher,
    { refreshInterval: POLL_WALLETS }
  );

  return {
    walletTraces: data?.traces ?? [],
    error,
    isLoading,
    mutate,
  };
}
