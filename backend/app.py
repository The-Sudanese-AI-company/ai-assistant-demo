"""
AI Assistant Backend - Flask API
Document-grounded question-answering chatbot built on Chroma vector store,
VoyageAI embeddings, and Google's Gemini model.
"""

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_chroma import Chroma
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_voyageai import VoyageAIEmbeddings
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# --- Configuration ---------------------------------------------------------
PERSISTENT_DIRECTORY = "db/chroma_db"
EMBEDDING_MODEL_NAME = "voyage-4"
CHAT_MODEL_NAME = "gemini-3.5-flash"
RETRIEVER_K = 5

# --- Resource initialization -----------------------------------------------
embedding_model = VoyageAIEmbeddings(model=EMBEDDING_MODEL_NAME)
db = Chroma(
    persist_directory=PERSISTENT_DIRECTORY,
    embedding_function=embedding_model,
    collection_metadata={"hnsw:space": "cosine"},
)
model = ChatGoogleGenerativeAI(model=CHAT_MODEL_NAME)


def extract_text(result):
    """Pull the text out of a model response."""
    content = result.content
    if isinstance(content, str):
        return content
    if isinstance(content, list) and content:
        first = content[0]
        if isinstance(first, dict):
            return first.get("text", "")
        return str(first)
    return str(content)

def clean_source_name(doc):
    raw_source = doc.metadata.get("source", "Unknown")   # "Unknown" if none is saved (no crash)
    return raw_source.replace("\\", "/").split("/")[-1]   # keep only the file name, drop the folders

def ask_question(user_question, chat_history, show_details=False):
    # Breadcrumb A: the request made it into our function
    print("STEP A: question received", flush=True)

    messages = []
    for msg in chat_history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))

    if messages:
        # Breadcrumb B: about to call Gemini to rewrite the question
        print("STEP B: rewriting question with Gemini...", flush=True)
        rewrite_messages = [
            SystemMessage(
                content="Given the chat history, rewrite the new question to be standalone and searchable. Just return the rewritten question."
            )
        ] + messages + [HumanMessage(content=f"New question: {user_question}")]
        
        result = model.invoke(rewrite_messages)
        search_question = extract_text(result).strip()
    else:
        search_question = user_question
    
    # Step 2: retrieve the most relevant documents.
    retriever = db.as_retriever(search_type="similarity",
                                search_kwargs={"k": RETRIEVER_K})
    print("STEP C: searching the document database...", flush=True)
    docs = retriever.invoke(search_question)

    # Breadcrumb D: search done, about to ask Gemini for the final answer
    print(f"STEP D: found {len(docs)} chunks, asking Gemini...", flush=True)
    
    # Prepare retrieval details
    retrieval_details = None
    if show_details:
        doc_previews = []
        doc_sources=[]
        for i, doc in enumerate(docs, 1):
            lines = doc.page_content.split("\n")[:2]
            preview = "\n".join(lines)
            doc_previews.append(f"Doc {i}: {preview}...")
            doc_sources.append(clean_source_name(doc))
        unique_sources = list(dict.fromkeys(doc_sources))
        retrieval_details = {
            "query": search_question if messages else None,
            "doc_count": len(docs),
            "sources":unique_sources,
            "documents": doc_previews
        }
    
    # Step 3: build the grounded prompt and answer.
    combined_query = f"""Based on the following documents, please answer this question: {user_question}
    Documents:
    {" ".join([f"- {doc.page_content}" for doc in docs])}
    Please provide a clear, helpful answer using only the information from these documents. If you can't find the answer in the documents, say "I don't have enough information to answer that question based on the provided documents." """
    
    answer_messages = [
        SystemMessage(
            content="You are a helpful assistant that answers questions based on provided documents and conversation history. if the user's question is written in Arabic, respond in Arabic. use the Saudi dialect. respond in English if the user asks in English"
        ),
    ] + messages + [
        HumanMessage(content=combined_query)
    ]
    
    result = model.invoke(answer_messages)
    answer = extract_text(result)
    
    return {
        "answer": answer,
        "retrieval_details": retrieval_details
    }


@app.route("/api/chat", methods=["POST"])
def chat():
    """Handle chat requests."""
    data = request.json
    user_question = data.get("question", "")
    chat_history = data.get("history", [])
    show_details = data.get("show_details", False)
    
    if not user_question:
        return jsonify({"error": "No question provided"}), 400
    
    try:
        response = ask_question(user_question, chat_history, show_details)
        return jsonify(response)
    except Exception as e:
        print("ERROR:", e, flush=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False) 
