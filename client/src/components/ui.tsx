import type { ReactNode } from 'react';

export const Loading = () => (
  <div>{[0, 1, 2, 3].map((i) => <div className="sk" key={i} />)}</div>
);
export const Empty = ({ children }: { children: ReactNode }) => <div className="state">{children}</div>;
export const Fail = ({ msg }: { msg: string }) => (
  <div className="state err">
    <div>Couldn't load this data: {msg}</div>
    <div>Check that the server is running, then reload.</div>
    <button className="ibtn" style={{ marginTop: 12 }} onClick={() => location.reload()}>Reload</button>
  </div>
);
export const Chip = ({ children, title }: { children: ReactNode; title?: string }) => (
  <span className="chip" title={title}>{children}</span>
);
