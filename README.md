# ONB Agent Copilot

Grounded assistant for Omdurman National Bank customer-service staff.
Questions are answered only from the bilingual knowledge base in
`backend/docs/onb-knowledge-base`, and every answer shows the entries it was
built from, with their verification status.

```
backend/   FastAPI + LangChain + Chroma (Voyage AI embeddings, Gemini answers)
frontend/  React + Vite, ONB visual identity, English and Arabic interface
```

## Knowledge base

`backend/docs/onb-knowledge-base/kb_chunks.jsonl` holds 258 pre-chunked
records (36 topics and 93 FAQs, each in English and Arabic). The ingestion
script embeds the `text` field and stores every other field as metadata; it
never re-splits. See that folder's README for the schema and the list of
open questions for ONB.

The backend follows the README's loading rules:

- Retrieves candidates, prefers chunks in the user's language, and swaps a
  hit in the other language for its twin by `pair_id`. One chunk per topic.
- Passes each chunk's `status` to the model. The knowledge base's own
  `agent_system_prompt.md` is the system prompt, plus a short note that the
  answer is read aloud by an agent.
- The Sources panel shows each entry's status: Verified, Confirm with ONB, or
  Assistant policy.

## Backend

```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
VOYAGE_API_KEY=...
GEMINI_API_KEY=...
# Optional, comma-separated. Defaults to * for the demo.
ALLOWED_ORIGINS=http://localhost:3000
# Optional. Defaults to gemini-3.5-flash. The free tier allows 20 requests per
# day per model, so on a 429 RESOURCE_EXHAUSTED error switch to another model
# (for example gemini-3.5-flash-lite or gemini-3.8-flash) and restart.
CHAT_MODEL=gemini-3.5-flash
# Optional. Seconds before a stalled Gemini call is reported as an error (default 45).
MODEL_TIMEOUT=45
```

Build the vector store once (re-run whenever `kb_chunks.jsonl` changes; it
writes to `backend/db/onb_kb`):

```powershell
python ingestion.py
```

Run the API:

```powershell
uvicorn app:app --reload --port 8000
```

Interactive API docs are at http://localhost:8000/docs.

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Liveness check, polled by the UI |
| `POST /api/chat` | Whole answer in one JSON response |
| `POST /api/chat/stream` | Server-sent events: `sources`, then `token` chunks, then `done` |

Production example: `gunicorn app:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT`

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. In development Vite proxies `/api` to port 8000.

For a deployed build set `VITE_API_URL` to the backend's public URL, then
`npm run build` (output in `frontend/dist`). `frontend/netlify.toml` is already
configured for Netlify.

## Design notes

- Palette and type follow onb-sd.com: one green accent (`#009341`) on a warm
  monochrome canvas, IBM Plex Sans with IBM Plex Sans Arabic, self-hosted.
- The working area is a single white sheet on the canvas. The composer is a
  nested tray and plate. Structure is hairline, shadows are diffused and
  tinted to the canvas.
- Theme follows the system by default. The display menu in the header offers
  System, Light or Dark and remembers the choice.
- Switching to Arabic flips the whole layout to right-to-left and swaps in the
  Arabic logo. Each message also sets its own direction from its content.
- Tokens live in `frontend/src/styles/tokens.css`. The full rule set for
  future UI work is in `.claude/skills/onb-ui-design/SKILL.md`.
