import React from 'react';
import ReactMarkdown from 'react-markdown';

/**
 * Language direction helper
 * --------------------------------------------------------------
 * Arabic is written right-to-left (RTL). English is left-to-right
 * (LTR). The browser does NOT figure this out on its own for our
 * chat bubbles, so we inspect the text and decide for it.
 *
 * How it decides, in plain words:
 *   1. Count how many Arabic letters are in the message.
 *   2. Count how many English letters are in the message.
 *   3. Whichever language has more letters "wins".
 *
 * The strange-looking \u0600-\u06FF is just the "address range"
 * where Arabic letters live inside Unicode (the giant master list
 * of every character a computer can display). So the pattern
 * simply means: "any character that is an Arabic letter".
 */
const isMostlyArabic = (text) => {
  // No text at all? Treat it as normal left-to-right.
  if (!text) return false;

  // Collect every Arabic character found (or an empty list if none).
  const arabicLetters = text.match(/[\u0600-\u06FF]/g) || [];

  // Collect every English (Latin) character found.
  const latinLetters = text.match(/[A-Za-z]/g) || [];

  // More Arabic than English means: show this message right-to-left.
  return arabicLetters.length > latinLetters.length;
};

/**
 * ChatMessage Component
 * Renders individual chat messages with proper styling.
 * Supports markdown formatting for rich content.
 * NEW: detects Arabic answers and displays them right-to-left,
 * which puts the numbers, bullets, colons and periods on the
 * correct side.
 */
const ChatMessage = ({ message }) => {
  // Determine if message is from user or assistant
  const isUser = message.role === 'user';

  // Decide the reading direction for THIS bubble only.
  // Every bubble makes its own decision, so an Arabic answer and an
  // English answer can sit in the same conversation and both look right.
  const isRtl = isMostlyArabic(message.content);

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      {/* Avatar - shows 'U' for User, 'AI' for Assistant */}
      <div className="message-avatar">
        {isUser ? 'U' : 'AI'}
      </div>

      {/*
        The dir attribute is the actual fix.
        dir="rtl" tells the browser: "everything inside this box reads
        right-to-left". That single word makes the browser move the
        text, the list numbers (1. 2. 3.), the bullet dots, AND the
        punctuation to the correct side. dir="ltr" keeps English
        messages exactly as they are today.
      */}
      <div className="message-content" dir={isRtl ? 'rtl' : 'ltr'}>
        <ReactMarkdown
          components={{
            p: ({children}) => <p>{children}</p>,
            ul: ({children}) => <ul>{children}</ul>,
            ol: ({children}) => <ol>{children}</ol>,
            li: ({children}) => <li>{children}</li>,
            code: ({children}) => <code>{children}</code>,
            strong: ({children}) => <strong>{children}</strong>,
            blockquote: ({children}) => <blockquote>{children}</blockquote>,
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default ChatMessage;