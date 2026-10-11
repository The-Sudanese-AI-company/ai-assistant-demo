"""
Build the ONB vector store from the knowledge base.

Source: docs/onb-knowledge-base/kb_chunks.jsonl (already chunked, one record
per topic or FAQ per language). We embed the `text` field and keep every
other field as metadata, as the knowledge base README asks. Nothing is
re-split.

Run from the backend folder:
    python ingestion.py
"""

import json
import os
import shutil
import sys

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_voyageai import VoyageAIEmbeddings

load_dotenv()

KB_PATH = os.path.join("docs", "onb-knowledge-base", "kb_chunks.jsonl")
PERSIST_DIRECTORY = os.path.join("db", "onb_kb")
COLLECTION_NAME = "onb_kb"
EMBEDDING_MODEL_NAME = "voyage-4"

# Chroma metadata values must be str, int, float or bool. Lists are joined
# with " | " and nulls become empty strings.
LIST_FIELDS = ("tags", "sources")


def load_records(path: str) -> list[dict]:
    if not os.path.exists(path):
        raise FileNotFoundError(f"Knowledge base not found at {path}")
    with open(path, encoding="utf-8") as f:
        records = [json.loads(line) for line in f if line.strip()]
    if not records:
        raise ValueError(f"{path} is empty")
    return records


def to_document(record: dict) -> Document:
    metadata = {}
    for key, value in record.items():
        if key == "text":
            continue
        if key in LIST_FIELDS:
            metadata[key] = " | ".join(value or [])
        elif value is None:
            metadata[key] = ""
        else:
            metadata[key] = value
    return Document(page_content=record["text"], metadata=metadata)


def build(records: list[dict]) -> Chroma:
    if os.path.exists(PERSIST_DIRECTORY):
        print(f"Removing old store at {PERSIST_DIRECTORY}")
        shutil.rmtree(PERSIST_DIRECTORY)

    docs = [to_document(r) for r in records]
    ids = [r["id"] for r in records]
    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate ids in the knowledge base")

    print(f"Embedding {len(docs)} chunks with {EMBEDDING_MODEL_NAME}")
    store = Chroma.from_documents(
        documents=docs,
        ids=ids,
        embedding=VoyageAIEmbeddings(model=EMBEDDING_MODEL_NAME),
        persist_directory=PERSIST_DIRECTORY,
        collection_name=COLLECTION_NAME,
        collection_metadata={"hnsw:space": "cosine"},
    )
    return store


def summarize(records: list[dict]) -> None:
    from collections import Counter

    print(f"  languages: {dict(Counter(r['lang'] for r in records))}")
    print(f"  types:     {dict(Counter(r['doc_type'] for r in records))}")
    print(f"  status:    {dict(Counter(r['status'] for r in records))}")
    print(f"  version:   {records[0].get('kb_version')}")


if __name__ == "__main__":
    records = load_records(KB_PATH)
    print(f"Loaded {len(records)} records from {KB_PATH}")
    summarize(records)
    store = build(records)
    count = store._collection.count()
    print(f"Done. {count} chunks stored in {PERSIST_DIRECTORY} (collection {COLLECTION_NAME})")
    sys.exit(0 if count == len(records) else 1)
