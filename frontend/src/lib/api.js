/**
 * Backend client.
 *
 * In development Vite proxies /api to the FastAPI server (vite.config.js),
 * so the base URL is empty. In production set VITE_API_URL to the public
 * backend URL.
 */
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/** Thrown when the server itself reports a failure (model error, bad request). */
export class ServerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ServerError';
  }
}

export async function healthCheck() {
  try {
    const res = await fetch(`${API_URL}/api/health`, { cache: 'no-store' });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'healthy';
  } catch {
    return false;
  }
}

/**
 * Stream an answer over server-sent events.
 *
 * Calls `onSources(details | null)` once, then `onToken(text)` for each
 * chunk. Resolves when the server sends "done". Rejects on a network
 * failure or a server-side "error" event. Pass an AbortSignal to stop.
 */
export async function streamChat({ question, history, showDetails, signal, onSources, onToken }) {
  const res = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history, show_details: showDetails }),
    signal,
  });

  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // Parse SSE frames: blocks separated by a blank line, each with
  // "event: name" and "data: json" lines.
  const handleFrame = (frame) => {
    let event = 'message';
    let data = '';
    for (const line of frame.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    if (!data) return null;
    const payload = JSON.parse(data);
    if (event === 'sources') onSources(payload);
    else if (event === 'token') onToken(payload.text);
    else if (event === 'error') throw new ServerError(payload.message || 'server error');
    return event;
  };

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (handleFrame(frame) === 'done') return;
    }
  }
}
