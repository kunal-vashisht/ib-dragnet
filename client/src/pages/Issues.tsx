import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Chip, Empty, Fail, Loading } from '../components/ui';
import { ago, full, useAsync } from '../lib';

const RANGES: [string, string, number][] = [
  ['all', 'All time', 0], ['1h', 'Last hour', 36e5], ['24h', 'Last 24 hours', 864e5],
  ['7d', 'Last 7 days', 6048e5], ['30d', 'Last 30 days', 2592e6],
];

export default function Issues() {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [release, setRelease] = useState('');
  const [range, setRange] = useState('all');
  const [sort, setSort] = useState<'last' | 'count'>('last');
  const [releases, setReleases] = useState<string[]>([]);

  useEffect(() => { const t = setTimeout(() => setQ(search), 250); return () => clearTimeout(t); }, [search]);

  const { data, error, loading } = useAsync(() => {
    const ms = RANGES.find((r) => r[0] === range)![2];
    return api.issues({ search: q, release, from: ms ? new Date(Date.now() - ms).toISOString() : undefined });
  }, [q, release, range]);

  useEffect(() => {
    if (data) setReleases((p) => [...new Set([...p, ...data.flatMap((i) => i.releases)])]);
  }, [data]);

  const rows = useMemo(
    () => [...(data || [])].sort((a, b) => sort === 'count' ? b.count - a.count : +new Date(b.lastSeen) - +new Date(a.lastSeen)),
    [data, sort],
  );

  return (
    <>
      <h1>Issues</h1>
      <div className="sub">Identical errors are grouped into one issue.</div>
      <div className="filters">
        <input placeholder="Search by message or file" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={release} onChange={(e) => setRelease(e.target.value)} aria-label="Release">
          <option value="">All releases</option>
          {releases.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Time range">
          {RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as 'last' | 'count')} aria-label="Sort">
          <option value="last">Sort by last seen</option>
          <option value="count">Sort by event count</option>
        </select>
      </div>
      <div className={'card' + (loading && data ? ' busy' : '')} style={{ marginTop: 0 }}>
        {error ? <Fail msg={error} /> : loading && !data ? <Loading /> : rows.length === 0 ? (
          <Empty>No issues match these filters. Clear the search or widen the time range.</Empty>
        ) : (
          <>
            <div className="row hd cols-issue"><span>Issue</span><span>Events</span><span>First seen</span><span>Last seen</span><span>Release</span></div>
            {rows.map((i) => (
              <a key={i.id} className="row cols-issue" href={`#/issues/${i.id}`}>
                <div className="main">
                  <div className="ttl" title={i.title}>{i.title}</div>
                  <div className="frame mono">{i.topFrame}</div>
                </div>
                <span className="num" data-l="Events">{i.count}</span>
                <span data-l="First seen" title={full(i.firstSeen)}>{ago(i.firstSeen)}</span>
                <span data-l="Last seen" title={full(i.lastSeen)}>{ago(i.lastSeen)}</span>
                <span>
                  <Chip title={i.releases.join(', ')}>
                    {i.releases[i.releases.length - 1]}{i.releases.length > 1 ? ` +${i.releases.length - 1}` : ''}
                  </Chip>
                </span>
              </a>
            ))}
          </>
        )}
      </div>
    </>
  );
}
