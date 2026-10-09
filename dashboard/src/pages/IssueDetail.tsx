import { api } from '../api/client';
import { Chip, Empty, Fail, Loading } from '../components/ui';
import { ago, full, useAsync } from '../lib';

export default function IssueDetail({ id }: { id: string }) {
  const issue = useAsync(async () => (await api.issues({})).find((i) => i.id === id), [id]);
  const evs = useAsync(() => api.issueEvents(id), [id]);
  const i = issue.data;
  return (
    <>
      <a className="back" href="#/">← All issues</a>
      {issue.error ? <Fail msg={issue.error} /> : issue.loading ? <Loading /> : !i ? <Empty>This issue doesn't exist or has no events.</Empty> : (
        <>
          <h1>{i.title}</h1>
          <div className="frame mono">{i.topFrame}</div>
          <div className="chips">
            <Chip>{i.count} events</Chip>
            <Chip title={full(i.firstSeen)}>First seen {ago(i.firstSeen)}</Chip>
            <Chip title={full(i.lastSeen)}>Last seen {ago(i.lastSeen)}</Chip>
            {i.releases.map((r) => <Chip key={r}>{r}</Chip>)}
          </div>
        </>
      )}
      <section className="card">
        <div className="card-h"><h2>Events</h2><span className="sub">Newest first</span></div>
        {evs.error ? <Fail msg={evs.error} /> : evs.loading ? <Loading /> : !evs.data?.length ? <Empty>No events recorded for this issue yet.</Empty> : (
          <>
            <div className="row hd cols-ev"><span>When</span><span>Event</span><span>Release</span><span>User</span></div>
            {evs.data.map((e) => (
              <a key={e.id} className="row cols-ev" href={`#/events/${e.id}`}>
                <span title={full(e.timestamp)}>{ago(e.timestamp)}</span>
                <span className="mono frame">{e.id}</span>
                <span><Chip>{e.release}</Chip></span>
                <span className="sub" data-l="User">{e.userId || 'Anonymous'}</span>
              </a>
            ))}
          </>
        )}
      </section>
    </>
  );
}
