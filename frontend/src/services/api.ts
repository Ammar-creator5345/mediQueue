import axios, { AxiosError } from "axios";

const baseURL = `http://localhost:5000/api`;

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

export const TOKEN_KEY = "mediqueue_token";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.endsWith("/login") && !path.endsWith("/signup")) {
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    return Promise.reject(err);
  },
);

export function apiErrorMessage(
  err: unknown,
  fallback = "Something went wrong",
): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string } | undefined;
    return data?.error ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
