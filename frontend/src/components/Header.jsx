import { useEffect, useRef, useState } from 'react';
import { ArrowCounterClockwise, SlidersHorizontal } from '@phosphor-icons/react';

const ICON = { size: 20, weight: 'light' };

function DisplayMenu({ t, theme, onTheme, showSources, onToggleSources }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const themes = ['system', 'light', 'dark'];

  return (
    <div className="menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.display.label}
        title={t.display.label}
      >
        <SlidersHorizontal {...ICON} />
      </button>

      {open && (
        <div className="menu__panel" role="group" aria-label={t.display.label}>
          <div className="menu__row">
            <span className="menu__label">{t.display.theme}</span>
            <div className="segment" role="group" aria-label={t.display.theme}>
              {themes.map((value) => (
                <button key={value} type="button" aria-pressed={theme === value} onClick={() => onTheme(value)}>
                  {t.display[value]}
                </button>
              ))}
            </div>
          </div>
          <div className="menu__row">
            <span className="menu__label">{t.display.sources}</span>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={showSources}
              aria-label={t.display.sources}
              onClick={onToggleSources}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({
  t,
  language,
  onLanguage,
  theme,
  onTheme,
  backend,
  showSources,
  onToggleSources,
  onReset,
  canReset,
}) {
  const logo = language === 'ar' ? '/brand/onb-logo-ar.png' : '/brand/onb-logo-en.png';

  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__logo-plate">
          <img className="header__logo" src={logo} alt="Omdurman National Bank" width="152" height="38" />
        </div>
        <div className="header__divider" aria-hidden="true" />
        <div className="header__title">
          <strong>{t.appTitle}</strong>
          <span>{t.appSubtitle}</span>
        </div>
      </div>

      <div className="header__actions">
        <div className="status" data-state={backend} role="status">
          <span className="status__dot" aria-hidden="true" />
          <span>{t.status[backend]}</span>
        </div>

        <div className="segment" role="group" aria-label="Language">
          <button type="button" aria-pressed={language === 'en'} onClick={() => onLanguage('en')} lang="en">
            EN
          </button>
          <button type="button" aria-pressed={language === 'ar'} onClick={() => onLanguage('ar')} lang="ar">
            عربي
          </button>
        </div>

        <DisplayMenu
          t={t}
          theme={theme}
          onTheme={onTheme}
          showSources={showSources}
          onToggleSources={onToggleSources}
        />

        <button
          type="button"
          className="text-btn header__reset"
          onClick={onReset}
          disabled={!canReset}
          aria-label={t.newConversation}
          title={t.newConversation}
        >
          <ArrowCounterClockwise size={16} weight="light" />
          <span className="header__reset-label">{t.newConversation}</span>
        </button>
      </div>
    </header>
  );
}
