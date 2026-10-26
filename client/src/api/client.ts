import type { EventSummary, Issue, IssueQuery, SdkEvent } from '../types';
//import * as mock from './mock';

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} (${url})`);
  return r.json();
}

const real = {
  issues: (q: IssueQuery) => {
    const p = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => v && p.set(k, v));
    return get<Issue[]>(`/api/issues?${p}`);
  },
  issueEvents: (id: string) => get<EventSummary[]>(`/api/issues/${encodeURIComponent(id)}/events`),
  event: (id: string) => get<SdkEvent>(`/api/events/${encodeURIComponent(id)}`),
};

export const api = real;
