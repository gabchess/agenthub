export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

/** True when NEXT_PUBLIC_API_URL is explicitly set (not the localhost fallback) */
export const API_CONFIGURED = !!process.env.NEXT_PUBLIC_API_URL;

/** Returns the full URL as an SWR key, or null when the API is not configured (prevents fetch) */
export function apiKey(path: string): string | null {
  return API_CONFIGURED ? `${API_BASE}${path}` : null;
}

export async function apiFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}
