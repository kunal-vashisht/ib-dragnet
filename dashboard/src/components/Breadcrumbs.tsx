import type { ReactNode } from 'react';
import type { ClickCrumb, ConsoleCrumb, Crumb, NetCrumb } from '../types';
import { full, offset } from '../lib';

interface View { tone: string; glyph: string; tag: string; body: ReactNode }

function describe(c: Crumb): View {
  switch (c.type) {
    case 'console': {
      const x = c as ConsoleCrumb;
      const tone = x.level === 'error' ? 'red' : x.level === 'warn' ? 'amber' : 'muted';
      return { tone, glyph: '>_', tag: `console.${x.level}`, body: <span className="msg">{x.message}</span> };
    }
    case 'fetch':
    case 'XMLHttpRequest': {
      const x = c as NetCrumb;
      const bad = !x.ok || x.status === 0 || x.status >= 400;
      return {
        tone: bad ? 'red' : 'green', glyph: '⇅', tag: c.type === 'fetch' ? 'fetch' : 'xhr',
        body: (
          <>
            <b className="verb">{String(x.method).toUpperCase()}</b>
            <span className="url" title={x.url}>{x.url}</span>
            <span className={'st ' + (bad ? 'red' : 'green')}>{x.status === 0 ? 'Network error' : x.status}</span>
            <span className="dur">{x.duration_ms}ms</span>
          </>
        ),
      };
    }
    case 'click': {
      const x = c as ClickCrumb;
      return { tone: 'accent', glyph: '◉', tag: 'click', body: <span>{String(x.tagName).toLowerCase()}{x.id ? `#${x.id}` : ''}</span> };
    }
    default: {
      const { type, timestamp, ...rest } = c;
      void timestamp;
      return { tone: 'muted', glyph: '•', tag: String(type), body: <span className="msg">{JSON.stringify(rest)}</span> };
    }
  }
}

export default function Breadcrumbs({ crumbs, errorTs, message }: { crumbs: Crumb[]; errorTs: number; message: string }) {
  const list = [...(crumbs || [])].sort((a, b) => a.timestamp - b.timestamp);
  return (
    <section className="card">
      <div className="card-h"><h2>Breadcrumbs</h2><span className="sub">{list.length} before the error</span></div>
      {list.length === 0 ? (
        <div className="state">No breadcrumbs were captured for this event.</div>
      ) : (
        <ol className="tl">
          {list.map((c, i) => {
            const v = describe(c);
            return (
              <li key={i} className={'cr ' + v.tone}>
                <span className="dot">{v.glyph}</span>
                <div className="cb">
                  <div className="ct">
                    <span className="tag">{v.tag}</span>
                    <span className="off" title={full(c.timestamp)}>{offset(c.timestamp - errorTs)}</span>
                  </div>
                  <div className="cbody">{v.body}</div>
                </div>
              </li>
            );
          })}
          <li className="cr red end">
            <span className="dot">!</span>
            <div className="cb">
              <div className="ct"><span className="tag">Error captured</span><span className="off">0ms</span></div>
              <div className="cbody"><span className="msg">{message}</span></div>
            </div>
          </li>
        </ol>
      )}
    </section>
  );
}
