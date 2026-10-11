"""
ONB Agent Copilot - FastAPI backend
Grounded question answering over the Omdurman National Bank knowledge base
(docs/onb-knowledge-base). Chroma vector store, Voyage AI embeddings,
Google Gemini for question rewriting and answering.

Run locally:
    python ingestion.py          # once, builds db/onb_kb from kb_chunks.jsonl
    uvicorn app:app --reload --port 8000

Production (Render, Railway, etc.):
    gunicorn app:app -k uvicorn.workers.UvicornWorker -b 0.0.0.0:$PORT
"""

import json
import os
import re
from typing import AsyncIterator, Literal

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_voyageai import VoyageAIEmbeddings
from pydantic import BaseModel, Field

load_dotenv()

# --- Configuration ---------------------------------------------------------
PERSISTENT_DIRECTORY = os.path.join("db", "onb_kb")
COLLECTION_NAME = "onb_kb"
KB_DIR = os.path.join("docs", "onb-knowledge-base")
SYSTEM_PROMPT_PATH = os.path.join(KB_DIR, "agent_system_prompt.md")
EMBEDDING_MODEL_NAME = "voyage-4"
# Free-tier Gemini quota is 20 requests per day PER MODEL, so switching the
# model name in .env is the quickest way past a 429 RESOURCE_EXHAUSTED error.
CHAT_MODEL_NAME = os.environ.get("CHAT_MODEL", "gemini-3.5-flash")
CANDIDATE_K = 8  # chunks fetched before language preference is applied
FINAL_K = 5  # chunks handed to the model
PREVIEW_CHARS = 240

# Comma-separated list of allowed browser origins, e.g.
# ALLOWED_ORIGINS=https://swa-rag.netlify.app,http://localhost:3000
# Defaults to "*" when unset. Quotes and trailing slashes are tolerated because
# a browser's Origin header never carries a trailing slash and the match is exact.
ALLOWED_ORIGINS = [
    o.strip().strip("'\"").rstrip("/")
    for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
    if o.strip().strip("'\"")
]

# Added below the knowledge base's own prompt: this deployment is a copilot
# for a human agent, so the answer is spoken by the agent, not sent as chat.
COPILOT_NOTE = """
## Deployment note
You are being used as a real-time copilot for an Omdurman National Bank customer-service agent on a live phone call. The agent reads your answer aloud to the customer, so write it to be spoken: no URLs spelled out letter by letter (say "the bank's website" or "the Exchange Rates page"), no markdown, no headings, no bold. Short numbered steps are fine.

Answer language is fixed by the customer's question, and each message states it explicitly: an English question gets an English answer; an Arabic question gets an answer in Sudanese dialect (اللهجة السودانية), polite and professional. Never switch languages on your own, even if the retrieved chunks are in the other language.
"""

REWRITE_PROMPT = (
    "Given the chat history, rewrite the new question to be standalone and searchable, "
    "in the same language as the new question. Return only the rewritten question, "
    "with no greeting or filler."
)


def load_system_prompt() -> str:
    """The knowledge base ships its own agent prompt. Use the part after the
    first horizontal rule (the text above it is editor notes)."""
    with open(SYSTEM_PROMPT_PATH, encoding="utf-8") as f:
        raw = f.read()
    body = raw.split("\n---\n", 1)[1] if "\n---\n" in raw else raw
    return body.strip() + "\n" + COPILOT_NOTE


SYSTEM_PROMPT = load_system_prompt()

# --- Resource initialization -----------------------------------------------
embedding_model = VoyageAIEmbeddings(model=EMBEDDING_MODEL_NAME)
db = Chroma(
    persist_directory=PERSISTENT_DIRECTORY,
    embedding_function=embedding_model,
    collection_name=COLLECTION_NAME,
    collection_metadata={"hnsw:space": "cosine"},
)
# A stalled model call surfaces as an error after MODEL_TIMEOUT seconds
# instead of leaving the agent staring at a loading state.
MODEL_TIMEOUT = int(os.environ.get("MODEL_TIMEOUT", "45"))
model = ChatGoogleGenerativeAI(model=CHAT_MODEL_NAME, timeout=MODEL_TIMEOUT, max_retries=1)

app = FastAPI(title="ONB Agent Copilot API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Request / response models ---------------------------------------------
class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    history: list[HistoryMessage] = []
    show_details: bool = False


# --- Helpers ---------------------------------------------------------------
ARABIC_RE = re.compile(r"[؀-ۿ]")
LATIN_RE = re.compile(r"[A-Za-z]")


def detect_lang(text: str) -> str:
    """'ar' when the text has more Arabic letters than Latin ones."""
    return "ar" if len(ARABIC_RE.findall(text)) > len(LATIN_RE.findall(text)) else "en"


def extract_text(result) -> str:
    """Pull the text out of a model response or stream chunk."""
    content = result.content
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                parts.append(item.get("text", ""))
            else:
                parts.append(str(item))
        return "".join(parts)
    return str(content)


def to_langchain_history(history: list[HistoryMessage]):
    messages = []
    for msg in history:
        if msg.role == "user":
            messages.append(HumanMessage(content=msg.content))
        else:
            messages.append(AIMessage(content=msg.content))
    return messages


def twin_of(doc: Document, lang: str) -> Document | None:
    """The same topic in the other language, looked up by pair_id."""
    pair_id = doc.metadata.get("pair_id")
    if not pair_id:
        return None
    hit = db.get(where={"$and": [{"pair_id": pair_id}, {"lang": lang}]}, include=["documents", "metadatas"])
    if not hit["ids"]:
        return None
    return Document(page_content=hit["documents"][0], metadata=hit["metadatas"][0])


def retrieve(query: str, lang: str) -> list[Document]:
    """Top chunks for the query, preferring the user's language.

    Follows the knowledge base README: fetch candidates, and when a hit is in
    the other language swap in its twin by pair_id. One chunk per topic.
    """
    candidates = db.similarity_search(query, k=CANDIDATE_K)
    chosen: list[Document] = []
    seen_pairs: set[str] = set()
    for doc in candidates:
        pair_id = doc.metadata.get("pair_id") or doc.metadata.get("id")
        if pair_id in seen_pairs:
            continue
        seen_pairs.add(pair_id)
        if doc.metadata.get("lang") != lang:
            doc = twin_of(doc, lang) or doc
        chosen.append(doc)
        if len(chosen) == FINAL_K:
            break
    return chosen


def format_context(docs: list[Document]) -> str:
    """Each chunk with its title and status, so the model can hedge on
    needs_confirmation items as the system prompt requires."""
    blocks = []
    for i, doc in enumerate(docs, 1):
        m = doc.metadata
        blocks.append(
            f"[{i}] title: {m.get('title', '')}\n"
            f"status: {m.get('status', '')} | source authority: {m.get('source_authority', '')} | category: {m.get('category', '')}\n"
            f"{doc.page_content}"
        )
    return "\n\n".join(blocks)


def build_retrieval_details(docs: list[Document], search_question: str, was_rewritten: bool) -> dict:
    """Shape the retrieved chunks for the Sources panel."""
    documents = []
    for doc in docs:
        m = doc.metadata
        text = " ".join(doc.page_content.split())
        sources = [s for s in (m.get("sources") or "").split(" | ") if s]
        documents.append(
            {
                "id": m.get("id"),
                "title": m.get("title", ""),
                "category": m.get("category", ""),
                "doc_type": m.get("doc_type", ""),
                "lang": m.get("lang", ""),
                "status": m.get("status", ""),
                "source_authority": m.get("source_authority", ""),
                "last_checked": m.get("last_checked", ""),
                "sources": sources,
                "preview": text[:PREVIEW_CHARS] + ("..." if len(text) > PREVIEW_CHARS else ""),
            }
        )
    categories = list(dict.fromkeys(d["category"] for d in documents))
    return {
        "query": search_question if was_rewritten else None,
        "doc_count": len(docs),
        "categories": categories,
        "documents": documents,
    }


def prepare(req: ChatRequest):
    """Rewrite the question (when there is history), retrieve, and build the
    final message list. Returns (messages, retrieval_details)."""
    history = to_langchain_history(req.history)

    if history:
        rewrite_messages = (
            [SystemMessage(content=REWRITE_PROMPT)]
            + history
            + [HumanMessage(content=f"New question: {req.question}")]
        )
        search_question = extract_text(model.invoke(rewrite_messages)).strip() or req.question
    else:
        search_question = req.question

    lang = detect_lang(req.question)
    docs = retrieve(search_question, lang)

    retrieval_details = None
    if req.show_details:
        retrieval_details = build_retrieval_details(docs, search_question, bool(history))

    language_name = "Arabic (Sudanese dialect)" if lang == "ar" else "English"
    combined_query = (
        f"Customer question: {req.question}\n"
        f"Customer language: {language_name}. Answer in {language_name}.\n\n"
        f"Knowledge base chunks:\n{format_context(docs)}\n\n"
        "Answer using only these chunks and the rules in your instructions. "
        "If they do not contain the answer, say you do not have that information and give the right next step."
    )

    answer_messages = [SystemMessage(content=SYSTEM_PROMPT)] + history + [HumanMessage(content=combined_query)]
    return answer_messages, retrieval_details


# --- Routes ----------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "healthy", "chunks": db._collection.count(), "model": CHAT_MODEL_NAME}


@app.post("/api/chat")
def chat(req: ChatRequest):
    """Whole answer in one response."""
    try:
        answer_messages, retrieval_details = prepare(req)
        answer = extract_text(model.invoke(answer_messages))
        return {"answer": answer, "retrieval_details": retrieval_details}
    except Exception as e:  # noqa: BLE001 - surface the message to the UI
        print("ERROR:", e, flush=True)
        return JSONResponse({"error": str(e)}, status_code=500)


def sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    """Server-sent events: first the retrieval details, then answer tokens.

    Events:
      sources  {query, doc_count, categories, documents} or null
      token    {"text": "..."}
      done     {}
      error    {"message": "..."}
    """

    async def generate() -> AsyncIterator[str]:
        try:
            answer_messages, retrieval_details = prepare(req)
            yield sse("sources", retrieval_details)
            async for chunk in model.astream(answer_messages):
                text = extract_text(chunk)
                if text:
                    yield sse("token", {"text": text})
            yield sse("done", {})
        except Exception as e:  # noqa: BLE001
            print("ERROR:", e, flush=True)
            yield sse("error", {"message": str(e)})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
