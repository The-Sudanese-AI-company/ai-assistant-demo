import { ArrowSquareOut, X } from '@phosphor-icons/react';
import { isMostlyArabic } from '../lib/text.js';

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function SourcesPanel({ t, details, pending, onHide }) {
  const s = t.sources;
  const docs = details?.documents || [];
  const categories = details?.categories || [];
  const label = (slug) => s.categories[slug] || slug;

  return (
    <aside className="sources" aria-label={s.title}>
      <div className="sources__head">
        <h2>
          {s.title}
          {details && <span className="sources__count">{details.doc_count}</span>}
        </h2>
        <button type="button" className="icon-btn" onClick={onHide} aria-label={s.hide} title={s.hide}>
          <X size={18} weight="light" />
        </button>
      </div>

      <div className="sources__body">
        {pending && (
          <div className="sources__skeleton" aria-busy="true" aria-label={s.searching}>
            <span style={{ width: '70%' }} />
            <span style={{ width: '90%' }} />
            <span style={{ width: '60%' }} />
            <span style={{ width: '85%' }} />
          </div>
        )}

        {!pending && !details && <p className="sources__empty">{s.empty}</p>}

        {!pending && details && (
          <>
            {details.query && (
              <section className="sources__section">
                <h3>{s.query}</h3>
                <p className="sources__query" dir="auto">
                  {details.query}
                </p>
              </section>
            )}

            {categories.length > 0 && (
              <section className="sources__section">
                <h3>{s.topics}</h3>
                <div className="topic-chips">
                  {categories.map((c) => (
                    <span className="topic-chip" key={c}>
                      {label(c)}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {docs.length > 0 && (
              <section className="sources__section">
                <h3>{s.passages}</h3>
                {docs.map((d, i) => {
                  const dir = isMostlyArabic(d.preview) ? 'rtl' : 'ltr';
                  const link = d.sources?.[0];
                  return (
                    <article className="passage" key={d.id} style={{ '--index': i }}>
                      <div className="passage__meta">
                        <span className="tag" data-status={d.status}>
                          {s.status[d.status] || d.status}
                        </span>
                        <span className="passage__category">{label(d.category)}</span>
                      </div>
                      <h4 className="passage__title" dir="auto">
                        {d.title}
                      </h4>
                      <p dir={dir} lang={dir === 'rtl' ? 'ar' : 'en'}>
                        {d.preview}
                      </p>
                      {link && (
                        <a className="passage__link" href={link} target="_blank" rel="noreferrer" title={s.openSource}>
                          <ArrowSquareOut size={14} weight="light" />
                          <span>{hostOf(link)}</span>
                        </a>
                      )}
                    </article>
                  );
                })}
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
