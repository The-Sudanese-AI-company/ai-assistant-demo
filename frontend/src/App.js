import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import ChatMessage from './components/ChatMessage';
import Sidebar from './components/Sidebar';
import EvidencePane from './components/EvidencePane';
import { sendMessage } from './services/api';

/**
 * Main Application Component - RAG Knowledge Retrieval System
 *
 * WHAT CHANGED IN THIS VERSION ("split design"):
 * Before, the "Sources" box only showed up squeezed in below a single
 * answer, then scrolled away as the conversation continued. Now the
 * screen is divided into two columns that sit side by side:
 *
 *   -------------------------------------------------
 *   |                        |                       |
 *   |   CHAT COLUMN          |   EVIDENCE COLUMN      |
 *   |   (questions and       |   ("Sources" - stays   |
 *   |    answers)            |    on screen at all    |
 *   |                        |    times)              |
 *   |                        |                       |
 *   -------------------------------------------------
 *
 * On a narrow phone screen there isn't room for two columns, so
 * App.css automatically stacks them instead (chat on top, sources
 * below) - you don't have to do anything in this file for that, it's
 * handled by a "media query" in the CSS.
 */
/**
 * A small dictionary of interface text in both languages. This does NOT
 * translate the AI's answers (those already follow whatever language the
 * agent types their question in) - it only covers the surrounding
 * screen text: placeholders, headings, and hints. Switching the EN / AR
 * buttons in the header swaps which half of this object gets used.
 */
const UI_TEXT = {
  en: {
    subtitle:'Your knowledge assistant',
    inputPlaceholder: 'Ask a question about your documents...',
    emptyTitle: 'Knowledge Search',
    emptyBody: 'Ask a question to search your documents and get AI-powered answers.',
    suggestionChips: [
      'What are the service days?',
      'When was the company founded?',
      'Where is the HQ of the company?',
    ],
    footerHint: 'Enter to search  |  Ctrl+B to toggle sidebar',
    statusText: 'Ready',
  },
  ar: {
    subtitle:'مساعدك الذكي',
    inputPlaceholder: 'اكتب سؤال العميل...',
    emptyTitle: 'ابحث في قاعدة المعرفة',
    emptyBody: 'اطرح سؤالاً للبحث في المستندات والحصول على إجابات مدعومة بالذكاء الاصطناعي.',
    suggestionChips: [
      'ما هي أيام العمل الرسمية في الشركة؟',
      "في أي سنة تأسست شركة نوفاتيك؟ ",
      'أين يقع المقر الرئيسي للشركة؟',
    ],
    footerHint: 'اضغط Enter للبحث  |  Ctrl+B لإظهار القائمة الجانبية',
    statusText: 'جاهز',
  },
};

function App() {

  const [messages, setMessages] = useState([]);           // the whole conversation so far
  const [input, setInput] = useState('');                 // whatever the agent is currently typing
  const [isLoading, setIsLoading] = useState(false);      // true while we're waiting for the backend
  const [showDetails, setShowDetails] = useState(true);   // whether the Sources column is turned on
  const [retrievalDetails, setRetrievalDetails] = useState(null); // the sources behind the LATEST answer
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // the small settings sidebar, far left
  const [copiedAnswer, setCopiedAnswer] = useState(null);  // remembers which answer was just copied
  const [language, setLanguage] = useState('en');          // 'en' or 'ar' - which language the INTERFACE text is shown in

  
  // every single time.
  const t = UI_TEXT[language];


  // like "scroll down to here".
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Every time a new message is added, smoothly scroll down so the
  // newest message is visible.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Keyboard shortcut: holding Ctrl (or Cmd on a Mac) and pressing "b"
  // opens or closes the settings sidebar, without needing the mouse.
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        setIsSidebarOpen(!isSidebarOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    // this "cleanup" line removes the listener again if the component
    // ever unmounts, so we don't leave old listeners hanging around
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);


  const handleSendMessage = async (e) => {
    e.preventDefault(); // stops the page from doing a full reload, which
                         // is the browser's normal (unwanted) behaviour
                         // when a <form> is submitted

    if (!input.trim() || isLoading) return; // ignore empty text or a
                                             // double-click while busy

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]); // add the question to the chat
    setInput('');
    setIsLoading(true);
    setRetrievalDetails(null); // clear yesterday's sources while we wait
                                // for the new ones, so nothing stale
                                // lingers in the evidence column

    try {
      // Turn our chat history into the simple {role, content} shape the
      // backend expects.
      const history = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await sendMessage(input.trim(), history, showDetails);

      if (response.error) {
        const errorMessage = {
          role: 'assistant',
          content: `Error: ${response.error}`
        };
        setMessages(prev => [...prev, errorMessage]);
      } else {
        const assistantMessage = {
          role: 'assistant',
          content: response.answer
        };
        setMessages(prev => [...prev, assistantMessage]);

        // This is exactly what the Sources column on the right will
        // display next - see EvidencePane.js.
        if (response.retrieval_details) {
          setRetrievalDetails(response.retrieval_details);
        }
      }
    } catch (error) {
      // this "catch" only runs for network-level failures (like the
      // backend being offline), not for errors the backend reports on
      // purpose - those are handled by the "if (response.error)" above
      const errorMessage = {
        role: 'assistant',
        content: `Error: ${error.message}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      // "finally" always runs, whether things succeeded or failed, so
      // the loading spinner never gets stuck on
      setIsLoading(false);
    }
  };

  /** Copies one answer's text to the clipboard, and briefly shows "Copied". */
  const handleCopyAnswer = (content) => {
    navigator.clipboard.writeText(content);
    setCopiedAnswer(content);
    setTimeout(() => setCopiedAnswer(null), 2000);
  };

  /** Wipes the conversation and the sources column, back to a blank slate. */
  const clearChat = () => {
    setMessages([]);
    setRetrievalDetails(null);
  };

  return (
    <div className="app">
      {/* The narrow settings sidebar on the far left - unchanged from
          before, it just opens/closes and holds the "show sources"
          toggle and the "clear conversation" button. */}
      <Sidebar
        showDetails={showDetails}
        setShowDetails={setShowDetails}
        onClearChat={clearChat}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        language={language}
      />

      {/* On phones, this darkens the rest of the screen while the
          sidebar is open, and closes the sidebar if you tap outside it. */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      <div className={`main-content ${!isSidebarOpen ? 'expanded' : ''}`}>
        <header className="chat-header">
          <div className="header-content">
            <div className="header-left">
              <button
                className="menu-button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>

              <div className="logo-container">
                {/* A simple hand-drawn water drop icon, the same style
                    (thin outline, no fill) as the other icons already in
                    this file, like the hamburger menu above. */}
                <div className="logo-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {/* three connected nodes = network / AI connectivity */}
                    <line x1="6" y1="6" x2="18" y2="12" />
                    <line x1="6" y1="6" x2="9" y2="18" />
                    <line x1="18" y1="12" x2="9" y2="18" />
                    <circle cx="6" cy="6" r="2" />
                    <circle cx="18" cy="12" r="2" />
                    <circle cx="9" cy="18" r="2" />
                  </svg>
                </div>
                <div>
                  <h1>NovaTech Solutions</h1>
                  {/* This subtitle is always shown in Arabic, regardless
                      of the EN / AR toggle - it's part of the
                      organisation's branding, not interface text that
                      should change. "dir=auto" just tells the browser
                      "look at this text and align it whichever way
                      makes sense for its language" - it's what makes
                      Arabic text hug the right instead of the left. */}
                  <p className="subtitle" dir="auto">{t.subtitle}</p>
                </div>
              </div>
            </div>

            <div className="header-right">
              {/* The language toggle. Clicking a button updates
                  "language" in state, which - because "t" above is
                  calculated from it - immediately swaps every piece of
                  interface text that reads from "t" to the other
                  language. It does NOT translate past answers, since
                  those already came back in whatever language the
                  question was asked in. */}
              <div className="language-toggle">
                <button
                  className={language === 'en' ? 'active' : ''}
                  onClick={() => setLanguage('en')}
                  aria-label="Switch interface to English"
                >
                  EN
                </button>
                <button
                  className={language === 'ar' ? 'active' : ''}
                  onClick={() => setLanguage('ar')}
                  aria-label="Switch interface to Arabic"
                >
                  AR
                </button>
              </div>

          

              <div className="status-indicator">
                <span className="status-dot"></span>
                <span className="status-text">{t.statusText}</span>
              </div>
            </div>
          </div>
        </header>

        {/*
          ============ THE SPLIT LAYOUT STARTS HERE ============
          "split-layout" (defined in App.css) is a row with two boxes
          side by side: chat-column and evidence-column. On a narrow
          screen, App.css switches this row to stack top-to-bottom
          instead - nothing in this file needs to change for that.
        */}
        <div className="split-layout">

          {/* ---------------- LEFT SIDE: the chat itself ---------------- */}
          <div className="chat-column">
            <div className="messages-wrapper">
              <div className="messages">
                {messages.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-state-icon">AI</div>
                    <h3 dir="auto">{t.emptyTitle}</h3>
                    <p dir="auto">{t.emptyBody}</p>
                    <div className="suggestion-chips">
                      {t.suggestionChips.map((question) => (
                        <button key={question} dir="auto" onClick={() => setInput(question)}>
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message, index) => {
                  const isAssistant = message.role === 'assistant';
                  const isCopied = copiedAnswer === message.content;

                  return (
                    <div key={index} className="message-wrapper">
                      <ChatMessage message={message} />
                      {isAssistant && !message.content.startsWith('Error') && (
                        <button
                          className={`copy-button ${isCopied ? 'copied' : ''}`}
                          onClick={() => handleCopyAnswer(message.content)}
                          aria-label="Copy answer to clipboard"
                        >
                          {isCopied ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="message assistant">
                    <div className="message-avatar">AI</div>
                    <div className="message-content">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Note for anyone comparing this to the old file: the
                    evidence pane used to be rendered right here, inside
                    the message list. It has moved out to its own column
                    below (evidence-column), so it no longer scrolls
                    away as the conversation grows. */}

                <div ref={messagesEndRef} />
              </div>
            </div>

            <form className="input-form" onSubmit={handleSendMessage}>
              <div className="input-wrapper">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.inputPlaceholder}
                  disabled={isLoading}
                  className="chat-input"
                  dir="auto"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="send-button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
              <div className="input-footer">
                <span dir="auto">{t.footerHint}</span>
              </div>
            </form>
          </div>

          {/* ---------------- RIGHT SIDE: the sources column ---------------- */}
          {/* This whole column only renders at all if "showDetails" is on
              (the toggle lives in the settings sidebar). When it's on,
              EvidencePane decides for itself whether to show real
              sources or a friendly "nothing yet" message - see
              EvidencePane.js for that logic. */}
          {showDetails && (
            <div className="evidence-column">
              <EvidencePane retrievalDetails={retrievalDetails} isLoading={isLoading} language={language} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default App;
