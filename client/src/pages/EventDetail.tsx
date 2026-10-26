import { api } from '../api/client';
import Breadcrumbs from '../components/Breadcrumbs';
import StackTrace from '../components/StackTrace';
import { Empty, Fail, Loading } from '../components/ui';
import { ago, full, useAsync } from '../lib';

export default function EventDetail({ id }: { id: string }) {
  const { data: ev, error, loading } = useAsync(() => api.event(id), [id]);
  return (
    <>
      <button className="back" onClick={() => (history.length > 1 ? history.back() : (location.hash = '#/'))}>← Back</button>
      {error ? <Fail msg={error} /> : loading ? <Loading /> : !ev ? <Empty>Event not found.</Empty> : (
        <>
          <h1 className="errtitle">{ev.message}</h1>
          <section className="card">
            <dl className="meta-g">
              {([
                ['Release', ev.release],
                ['Time', `${full(ev.timestamp)} (${ago(ev.timestamp)})`],
                ['Event size', typeof ev.sizeKB === 'number' ? `${ev.sizeKB.toFixed(2)} KB` : undefined],
                ['User', ev.userId],
                ['Client', ev.clientId],
                ['Build', ev.buildId],
                ['Event ID', ev.id],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </section>
          <StackTrace unminified={ev.unminifiedStack} raw={ev.stack} />
          <Breadcrumbs crumbs={ev.breadcrumbs} errorTs={Date.parse(ev.timestamp)} message={ev.message} />
        </>
      )}
    </>
  );
}
