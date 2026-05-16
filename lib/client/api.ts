export async function apiRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({ data: null, error: "Invalid server response" }));

  if (!response.ok || payload.error) {
    throw new Error(payload.error || "Request failed");
  }

  return payload.data as T;
}
