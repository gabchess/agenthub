import useSWR from "swr";
import { apiKey, API_CONFIGURED } from "../api";
import { DEMO_GUARDRAILS } from "../demo-data";
import type { Guardrail } from "../types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useGuardrails() {
  const { data, error, isLoading, mutate } = useSWR<Guardrail[]>(
    apiKey("/api/guardrails"),
    fetcher
  );

  return {
    guardrails: data ?? (API_CONFIGURED ? [] : DEMO_GUARDRAILS),
    error,
    isLoading: API_CONFIGURED ? isLoading : false,
    mutate,
  };
}
