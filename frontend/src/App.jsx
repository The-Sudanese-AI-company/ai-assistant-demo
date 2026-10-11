import { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import EmptyState from './components/EmptyState.jsx';
import Message from './components/Message.jsx';
import Composer from './components/Composer.jsx';
import SourcesPanel from './components/SourcesPanel.jsx';
import { UI } from './i18n.js';
import { healthCheck, streamChat } from './lib/api.js';

const THEME_KEY = 'onb-copilot-theme';
const LANG_KEY = 'onb-copilot-lang';
const THEMES = ['system', 'light', 'dark'];

function readStored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode, ignore */
  }
}

let nextId = 1;

export default function App() {
  const [language, setLanguage] = useState(() => readStored(LANG_KEY, 'en'));
  // "system" follows the OS preference; "light" and "dark" are explicit.
  const [theme, setTheme] = useState(() => {
    const stored = readStored(THEME_KEY, 'system');
    return THEMES.includes(stored) ? stored : 'system';
  });
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sources, setSources] = useState(null); // details for the latest answer
  const [sourcesPending, setSourcesPending] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [backend, setBackend] = useState('checking'); // checking | online | offline

  const abortRef = useRef(null);
  const scrollRef = useRef(null);

  const t = UI[language];

  // Language drives document direction and the lang attribute so the
  // right font family and text alignment apply to the whole interface.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = t.dir;
    writeStored(LANG_KEY, language);
  }, [language, t.dir]);

  // Resolve the theme to light or dark and write it to <html data-theme>.
  useEffect(() => {
    writeStored(THEME_KEY, theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    if (theme !== 'system') return undefined;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  // Backend health, checked on load and every 30 seconds.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const ok = await healthCheck();
      if (!cancelled) setBackend(ok ? 'online' : 'offline');
    };
    check();
    const id = setInterval(check, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Keep the newest message in view.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const updateLast = useCallback((patch) => {
    setMessages((prev) => {
      const next = prev.slice();
      const last = next[next.length - 1];
      next[next.length - 1] = { ...last, ...(typeof patch === 'function' ? patch(last) : patch) };
      return next;
    });
  }, []);

  const send = useCallback(
    async (text) => {
      const question = text.trim();
      if (!question || isStreaming) return;

      const history = messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [
        ...prev,
        { id: nextId++, role: 'user', content: question },
        { id: nextId++, role: 'assistant', content: '', streaming: true },
      ]);
      setIsStreaming(true);
      setSources(null);
      setSourcesPending(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamChat({
          question,
          history,
          showDetails: true,
          signal: controller.signal,
          onSources: (details) => {
            setSources(details);
            setSourcesPending(false);
          },
          onToken: (chunk) => updateLast((last) => ({ content: last.content + chunk })),
        });
        updateLast({ streaming: false });
      } catch (err) {
        const aborted = err?.name === 'AbortError';
        const serverSide = err?.name === 'ServerError';
        updateLast((last) => {
          if (aborted && last.content) return { streaming: false };
          let message;
          if (aborted) message = t.errors.stopped;
          else if (serverSide) message = t.errors.generic;
          else message = t.errors.network;
          const detail = serverSide ? String(err.message).slice(0, 160) : null;
          return { streaming: false, error: true, content: message, detail };
        });
        // Only a transport failure means the backend is unreachable.
        if (!aborted && !serverSide) setBackend('offline');
      } finally {
        setIsStreaming(false);
        setSourcesPending(false);
        abortRef.current = null;
      }
    },
    [isStreaming, messages, t, updateLast]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSources(null);
    setSourcesPending(false);
  }, []);

  return (
    <div className="shell">
      <Header
        t={t}
        language={language}
        onLanguage={setLanguage}
        theme={theme}
        onTheme={setTheme}
        backend={backend}
        showSources={showSources}
        onToggleSources={() => setShowSources((v) => !v)}
        onReset={reset}
        canReset={messages.length > 0}
      />

      <main className="sheet" data-sources={showSources ? 'open' : 'closed'}>
        <section className="chat" aria-label={t.appTitle}>
          <div className="chat__scroll" ref={scrollRef}>
            <div className="chat__inner">
              {messages.length === 0 ? (
                <EmptyState t={t} onPick={send} />
              ) : (
                messages.map((m) => <Message key={m.id} message={m} t={t} />)
              )}
            </div>
          </div>
          <Composer t={t} disabled={backend === 'offline'} isStreaming={isStreaming} onSend={send} onStop={stop} />
        </section>

        {showSources && (
          <SourcesPanel t={t} details={sources} pending={sourcesPending} onHide={() => setShowSources(false)} />
        )}
      </main>
    </div>
  );
}
