export const API_URL = import.meta.env.VITE_API_URL || "";

export async function safeFetchJson<T = any>(
  endpoint: string,
  options?: RequestInit
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const url = endpoint.startsWith("http") ? endpoint : `${API_URL}${endpoint}`;
    const res = await fetch(url, options);
    const text = await res.text();
    if (!text || text.trim() === "") {
      return { ok: res.ok, data: null };
    }
    try {
      const data = JSON.parse(text) as T;
      return {
        ok: res.ok,
        data,
        error: !res.ok ? ((data as any)?.error || `Request failed (${res.status})`) : undefined,
      };
    } catch {
      return { ok: false, data: null, error: "Invalid response format" };
    }
  } catch (err: any) {
    return { ok: false, data: null, error: err?.message || "Network request failed" };
  }
}