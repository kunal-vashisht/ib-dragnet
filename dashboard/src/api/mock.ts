
/** import type { Crumb, EventSummary, Issue, IssueQuery, SdkEvent } from '../types';

const NOW = Date.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const REL = ['20261006T102232124Z-unknown', '20261005T181540002Z-a1b2c3d'];

const minified = (m: string) =>
  `Error: ${m}\n` + [0, 1, 2, 3].map((i) => `    at http://localhost:3000/js/main.a8ab08597da1fc5eed2f.js:2:${1930358 - i * 1571}`).join('\n');
const unminified = (m: string, f: string[]) =>
  `Error: ${m}\n` + f.map((x) => `    at (webpack://dhani/${x})`).join('\n');

const crumbs = (t: number, msg: string, net?: boolean): Crumb[] => [
  { type: 'console', level: 'log', message: "CleverTap info: Empty value for key 'partner_code' was removed", timestamp: t - 300 },
  { type: 'XMLHttpRequest', method: 'GET', url: 'http://localhost:3000/api/v1/data-transfer/retrieve?key=REDACTED', status: 200, ok: true, readyState: 4, duration_ms: 154, timestamp: t - 290 },
  { type: 'fetch', method: 'GET', url: 'https://server.apxor.com/v2/api/sdk/9f56a62a-4b1f-40c8-aa9d-e3b7a410911d/enabled-status?platform=web&version=312', status: 200, ok: true, duration_ms: 173, timestamp: t - 210 },
  { type: 'click', tagName: 'BUTTON', id: 'save-profile', timestamp: t - 150 },
  { type: 'console', level: 'warn', message: 'Retrying request (1/3)', timestamp: t - 90 },
  net
    ? { type: 'XMLHttpRequest', method: 'POST', url: 'http://localhost:3000/api/v1/loans/apply', status: 502, ok: false, readyState: 4, duration_ms: 2310, timestamp: t - 40 }
    : { type: 'XMLHttpRequest', method: 'GET', url: 'http://localhost:3000/api/v1/default-login?cuserid=1084877', status: 200, ok: true, readyState: 4, duration_ms: 215, timestamp: t - 40 },
  { type: 'navigation', from: '/profile', to: '/profile/edit', timestamp: t - 20 },
  { type: 'console', level: 'error', message: `Error: ${msg}`, timestamp: t - 1 },
];

// ages are in minutes before now
const T = [
  { m: 'Profile image not found for client', f: ['src/store/slices/userData/thunks.ts:122:14', 'src/store/slices/userData/thunks.ts:2:0', 'src/store/slices/userData/thunks.ts:2:0'], ages: [4, 95, 1300], u: ['1084877', '1084877', '2291003'] },
  { m: "Cannot read properties of undefined (reading 'map')", f: ['src/components/orders/OrderList.tsx:48:21', 'node_modules/react-dom/cjs/react-dom.development.js:16227:11', 'src/pages/Orders.tsx:31:5'], ages: [22, 610], u: ['1190442', '1190442'] },
  { m: 'Request failed with status code 502', f: ['node_modules/axios/lib/core/settle.js:19:12', 'src/api/http.ts:57:11', 'src/store/slices/loans/thunks.ts:88:9'], ages: [8, 40], u: ['1033120', '1500871'], net: true },
  { m: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`, f: ['src/utils/parseResponse.ts:14:20', 'src/api/http.ts:71:16'], ages: [170, 2900] },
  { m: 'ChunkLoadError: Loading chunk 482 failed', f: ['src/router/lazyRoutes.ts:9:33'], ages: [15] },
];

const rows = T.flatMap((t, ti) =>
  t.ages.map((age, ei) => {
    const ts = NOW - age * 60000;
    const ev: SdkEvent = {
      id: `evt_${ti}_${ei}`, message: t.m, stack: minified(t.m), unminifiedStack: unminified(t.m, t.f),
      release: REL[ei % 2], timestamp: new Date(ts).toISOString(), sizeKB: +(1.2 + ti * 0.4 + ei * 0.3).toFixed(2),
      userId: t.u?.[ei], clientId: 'dhani-web', buildId: ei % 2 ? 'b-4181' : 'b-4207', breadcrumbs: crumbs(ts, t.m, t.net),
    };
    return { issue: `iss_${ti}`, ev };
  }),
);

const match = (e: SdkEvent, q: IssueQuery) =>
  (!q.release || e.release === q.release) && (!q.from || e.timestamp >= q.from) && (!q.to || e.timestamp <= q.to);

export const api = {
  async issues(q: IssueQuery): Promise<Issue[]> {
    await sleep(250);
    const s = (q.search || '').toLowerCase();
    return T.flatMap((t, i) => {
      const id = `iss_${i}`;
      const es = rows.filter((r) => r.issue === id && match(r.ev, q)).map((r) => r.ev);
      const top = t.f.find((x) => !x.includes('node_modules')) || t.f[0];
      if (!es.length || (s && !`${t.m} ${top}`.toLowerCase().includes(s))) return [];
      const ts = es.map((e) => e.timestamp).sort();
      return [{ id, title: t.m, topFrame: top, count: es.length, firstSeen: ts[0], lastSeen: ts[ts.length - 1], releases: [...new Set(es.map((e) => e.release))] }];
    });
  },
  async issueEvents(id: string): Promise<EventSummary[]> {
    await sleep(200);
    return rows.filter((r) => r.issue === id).map((r) => r.ev)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .map(({ id, timestamp, release, userId }) => ({ id, timestamp, release, userId }));
  },
  async event(id: string): Promise<SdkEvent> {
    await sleep(200);
    const r = rows.find((x) => x.ev.id === id);
    if (!r) throw new Error('Event not found');
    return r.ev;
  },
};

*/