import { ChatCircleText, ShieldCheck } from '@phosphor-icons/react';

export default function EmptyState({ t, onPick }) {
  return (
    <div className="empty">
      <div>
        <h1>{t.emptyTitle}</h1>
        <p>{t.emptyBody}</p>
      </div>

      <div className="empty__grid">
        {t.suggestions.map((q, i) => (
          <button key={q} type="button" className="suggest" style={{ '--index': i }} onClick={() => onPick(q)}>
            <ChatCircleText size={18} weight="light" />
            <span>{q}</span>
          </button>
        ))}
      </div>

      <div className="empty__note">
        <ShieldCheck size={16} weight="light" />
        <span>{t.emptyNote}</span>
      </div>
    </div>
  );
}
