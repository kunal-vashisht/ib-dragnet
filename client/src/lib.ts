import { useEffect, useState } from 'react';

export const ago = (t: string | number) => {
  const s = Math.max(0, (Date.now() - new Date(t).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const full = (t: string | number) => new Date(t).toLocaleString();
export const offset = (ms: number) => {
  if (ms === 0) return '0ms';
  const a = Math.abs(ms);
  return (ms < 0 ? '-' : '+') + (a < 1000 ? `${a}ms` : `${(a / 1000).toFixed(1)}s`);
};

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [s, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  useEffect(() => {
    let live = true;
    set((p) => ({ ...p, loading: true, error: undefined }));
    fn().then(
      (data) => live && set({ data, loading: false }),
      (e) => live && set({ error: String(e?.message || e), loading: false }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}
