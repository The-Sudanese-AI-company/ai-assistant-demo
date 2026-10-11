import { useEffect, useRef, useState } from 'react';
import { PaperPlaneRight, Stop } from '@phosphor-icons/react';

export default function Composer({ t, disabled, isStreaming, onSend, onStop }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);

  // Grow with content up to the CSS max-height.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || isStreaming || disabled) return;
    onSend(value);
    setValue('');
    ref.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="composer__shell">
        <div className="composer__box">
          <textarea
            ref={ref}
            className="composer__input"
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            aria-label={t.placeholder}
            disabled={disabled}
            dir="auto"
            autoFocus
          />
          {isStreaming ? (
            <button type="button" className="send-btn" data-mode="stop" onClick={onStop} aria-label={t.stop} title={t.stop}>
              <Stop size={18} weight="fill" />
            </button>
          ) : (
            <button type="submit" className="send-btn" disabled={disabled || !value.trim()} aria-label={t.send} title={t.send}>
              <PaperPlaneRight size={18} weight="fill" />
            </button>
          )}
        </div>
      </div>
      <p className="composer__hint">
        <span>
          <kbd>Enter</kbd> {t.hintSend}
        </span>
        <span>
          <kbd>Shift</kbd>
          <kbd>Enter</kbd> {t.hintNewline}
        </span>
      </p>
    </form>
  );
}
