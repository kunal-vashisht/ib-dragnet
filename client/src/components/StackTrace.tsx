import { useState } from 'react';

const isFrame = (l: string) => /^\s*at /.test(l);

export default function StackTrace({ unminified, raw }: { unminified: string; raw: string }) {
  const [showRaw, setShowRaw] = useState(false);
  const lines = (showRaw ? raw : unminified || raw).split('\n');
  const hit = showRaw ? -1 : lines.findIndex((l) => isFrame(l) && !l.includes('node_modules'));
  return (
    <section className="card">
      <div className="card-h">
        <h2>Stack trace</h2>
        <div className="seg">
          <button className={!showRaw ? 'on' : ''} onClick={() => setShowRaw(false)}>Unminified</button>
          <button className={showRaw ? 'on' : ''} onClick={() => setShowRaw(true)}>Raw</button>
        </div>
      </div>
      <pre className="stack">
        {lines.map((l, i) => (
          <span key={i} className={'ln' + (i === hit ? ' hit' : '') + (isFrame(l) ? '' : ' head')}>{l || ' '}</span>
        ))}
      </pre>
    </section>
  );
}
