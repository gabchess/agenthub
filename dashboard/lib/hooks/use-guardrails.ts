import useSWR from "swr";
import type { Guardrail } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useGuardrails() {
  const { data, error, isLoading, mutate } = useSWR<Guardrail[]>(
    "/api/guardrails",
    fetcher
  );

  return {
    guardrails: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
