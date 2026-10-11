import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Copy } from '@phosphor-icons/react';
import { isMostlyArabic } from '../lib/text.js';

export default function Message({ message, t }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const dir = isMostlyArabic(message.content) ? 'rtl' : 'ltr';
  const pending = message.streaming && !message.content;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked; nothing to do */
    }
  };

  return (
    <article className="msg" data-role={message.role} data-error={message.error ? 'true' : undefined}>
      <div className="msg__meta">
        <span>{isUser ? t.you : t.assistant}</span>
        {pending && <span>{t.thinking}</span>}
      </div>

      {pending ? (
        <div className="skeleton" aria-busy="true" aria-label={t.thinking}>
          <span />
          <span />
          <span />
        </div>
      ) : (
        <div
          className="msg__bubble"
          dir={dir}
          lang={dir === 'rtl' ? 'ar' : 'en'}
          data-streaming={message.streaming ? 'true' : undefined}
        >
          {isUser || message.error ? <p>{message.content}</p> : <ReactMarkdown>{message.content}</ReactMarkdown>}
          {message.detail && <p className="msg__detail">{message.detail}</p>}
        </div>
      )}

      {!isUser && !message.error && !message.streaming && message.content && (
        <div className="msg__tools">
          <button type="button" className="text-btn" onClick={copy}>
            {copied ? <Check size={14} weight="light" /> : <Copy size={14} weight="light" />}
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}
    </article>
  );
}
