import { useEffect, useState } from 'react';
import EventDetail from './pages/EventDetail';
import IssueDetail from './pages/IssueDetail';
import Issues from './pages/Issues';

const read = () => location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);

function useRoute() {
  const [r, set] = useState(read);
  useEffect(() => {
    const h = () => { set(read()); window.scrollTo(0, 0); };
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);
  return r;
}

export default function App() {
  const route = useRoute();
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  const page =
    route[0] === 'issues' && route[1] ? <IssueDetail key={route[1]} id={route[1]} /> :
    route[0] === 'events' && route[1] ? <EventDetail key={route[1]} id={route[1]} /> :
    <Issues />;

  return (
    <>
      <header className="bar">
        <a className="logo" href="#/"><i />SDK Errors</a>
        <span className="sp" />
        <button className="ibtn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? 'Light theme' : 'Dark theme'}
        </button>
      </header>
      <main>{page}</main>
    </>
  );
}
