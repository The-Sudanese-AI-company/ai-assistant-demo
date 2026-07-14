import React from 'react';

/** Small translated strings just for this one component. */
const TEXT = {
  en: {
    heading: 'Sources',
    searching: 'Searching your documents...',
    empty: 'Sources for the next answer will appear here.',
  },
  ar: {
    heading: 'المصادر',
    searching: 'جارٍ البحث في المستندات...',
    empty: 'ستظهر هنا مصادر الإجابة القادمة.',
  },
};

/** A small checkmark-in-a-circle icon, used next to the section label
 *  to say "this answer is backed by a real document", not a guess. */
const VerifiedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

/** A small document/file icon, used on every source chip. */
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

/**
 * EvidencePane Component
 *
 * Shows WHERE an answer came from. Two parts:
 *   1. One highlighted "section" line - the topic of the best-matching
 *      document, e.g. "New connections > Requesting a new water
 *      connection".
 *   2. A row of small chips, one per source FILE that was used
 *      (duplicates removed, so a file that supplied two separate
 *      chunks still only shows up once).
 *
 * PROPS:
 *  - retrievalDetails: the sources for the MOST RECENT answer, or null.
 *    Shape (from the Flask backend in app.py):
 *      {
 *        query: "..." | null,
 *        doc_count: 5,
 *        documents: [
 *          { source: "new_connections.md", section: "New connections > ...", preview: "..." },
 *          ...
 *        ]
 *      }
 *  - isLoading: true while we're waiting on an answer.
 *  - language: 'en' or 'ar', controls which language THIS component's
 *    own labels are shown in (the "Sources" heading, empty states).
 */
const EvidencePane = ({ retrievalDetails, isLoading, language = 'en' }) => {
  const text = TEXT[language];

  // ---- CASE 1: nothing to show yet --------------------------------------
  if (!retrievalDetails) {
    return (
      <div className="evidence-pane evidence-pane-empty">
        <div className="evidence-header">
          <h4 dir="auto">{text.heading}</h4>
        </div>
        <p className="evidence-empty-text" dir="auto">
          {isLoading ? text.searching : text.empty}
        </p>
      </div>
    );
  }

  const { documents } = retrievalDetails;
  const { sources=[] } = retrievalDetails;


  // The green headline label uses the FIRST (best-matching) document's
  // section, since that's the one most likely to be what the answer is



  // Build the list of file chips, removing duplicates - if three chunks
  // all came from the same file, we only want to show that file once.
  // "seen" keeps track of which file names we've already added.
  const seen = new Set(sources);
  const uniqueSources = [...seen];
  for (const doc of sources) {
    if (!seen.has(doc.source)) {
      seen.add(doc.source);
      uniqueSources.push(doc.source);
    }
  }

  return (
    <div className="evidence-pane">
      <div className="evidence-header">
        <h4 dir="auto">{text.heading}</h4>
        <span className="badge">{documents.length}</span>
      </div>

      {uniqueSources.length > 0 && (
        <div className="evidence-section-label">
          <VerifiedIcon />
          <span dir="auto">{uniqueSources.join(",")}</span>
          <span dir="auto">{uniqueSources.length}</span>
        </div>
      )}

      <div className="source-chips">
        {uniqueSources.map((source) => (
          <div className="source-chip" key={source}>
            <FileIcon />
            {source}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EvidencePane;
