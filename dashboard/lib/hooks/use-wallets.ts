import useSWR from "swr";
import { POLL_WALLETS } from "../constants";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_WALLET_TRACES } from "../demo-data";
import type { Trace } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface WalletData {
  traces: Trace[];
}

export function useWallets() {
  const { data, error, isLoading, mutate } = useSWR<WalletData>(
    apiKey("/api/wallets"),
    fetcher,
    { refreshInterval: POLL_WALLETS }
  );

  return {
    walletTraces: data?.traces ?? (API_CONFIGURED ? [] : DEMO_WALLET_TRACES),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
