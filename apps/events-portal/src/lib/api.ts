export function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost")) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location?.hostname) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${hostname}:4001/api`;
  }
  return process.env.NEXT_PUBLIC_API_URL as string;
}

export const API_BASE_URL = typeof window !== "undefined" ? getApiUrl() : (process.env.NEXT_PUBLIC_API_URL as string);

export async function fetchApi(path: string, options: RequestInit = {}) {
  const url = `${getApiUrl()}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || errorData.error || "An error occurred");
  }

  return res.json();
}

