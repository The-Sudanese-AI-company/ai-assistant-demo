import React from 'react';

/**
 * Sidebar Component
 * Toggleable sidebar with settings and system information
 * - Desktop: Always visible with toggle button in header
 * - Mobile: Slides in from left with overlay
 */
const TEXT = {
  en: {
    heading: 'Knowledge Assistant',
    subheader: 'RAG document search for quick knowledge retrieval',
    settings: 'Sources for the next answer will appear here.',
    showButton: 'Show sources',
    buttonClear: 'Clear conversation',
  },
  ar: {
    heading: 'مساعدك الذكي',
    subheader: "البجث السريع في استراجاع المعرفه باستخدام تقنية  \"RAG\" ",
    settings: 'ستظهر هنا مصادر الإجابة القادمة.',
    showButton: 'إظهار المصادر',
    buttonClear: 'مسح المحادثة',
  },
};
const Sidebar = ({ 
  showDetails, 
  setShowDetails, 
  onClearChat, 
  isOpen, 
  onToggle ,
  language = 'en'
}) => {
  const text = TEXT[language];
  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-header-top">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">AI</div>
              <span>{text.heading}</span>
            </div>
            <button 
              className="sidebar-close-btn"
              onClick={onToggle}
              aria-label="Close menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
          </div>
          <p className="sidebar-description">
            {text.subheader}
          </p>
        </div>
        
        <div className="sidebar-content">
          <div>
            <div className="sidebar-section-title">{text.settings}</div>
            <div 
              className="sidebar-item"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span className="sidebar-item-label">{text.showButton}</span>
              <div className={`toggle-switch ${showDetails ? 'active' : ''}`}>
                <div className="toggle-knob"></div>
              </div>
            </div>
          </div>
          
          <button className="sidebar-action-btn" onClick={onClearChat}>
            {text.buttonClear}
          </button>
        </div>
        
        
      </div>
    </>
  );
};

export default Sidebar;