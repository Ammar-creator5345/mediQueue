import { useEffect, useRef, useState, useCallback } from "react";

export function usePolling<T>(fn: () => Promise<T>, intervalMs = 4000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const mountedRef = useRef<boolean>(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const tick = useCallback(async () => {
    try {
      const r = await fnRef.current();
      if (!mountedRef.current) return;
      setData(r);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    tick();
    const id = window.setInterval(tick, intervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [tick, intervalMs]);

  return { data, error, loading, refresh: tick };
}
