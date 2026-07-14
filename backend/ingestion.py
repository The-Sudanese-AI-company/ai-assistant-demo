import os 
from langchain_community.document_loaders import PyPDFLoader,DirectoryLoader,PyMuPDFLoader
from langchain_chroma import Chroma
from langchain_text_splitters import CharacterTextSplitter
from langchain_voyageai import VoyageAIEmbeddings
from dotenv import load_dotenv

load_dotenv()
voyage_api_key = os.environ.get("VOYAGE_API_KEY")

def load_documents(docs_path = "docs"):

    if not os.path.exists(docs_path):
        raise FileNotFoundError(f"the directory {docs_path} does not exist. Try again and double check if you selected the correct directory")
    
    print("="*20)
    print(f"loading documents from: {docs_path}")

    loader = DirectoryLoader(
        path=docs_path,
        glob="*.pdf",
        loader_cls=PyMuPDFLoader

    )
    documents = loader.load()
    if len(documents)==0:
        raise FileNotFoundError(f"There are no .pdf files in the directory {docs_path}")
    
    # for item, doc in enumerate(documents):
    #     print(f"Document {item}")
    #     print(f" content length {len(doc.page_content)}")
    
    return documents

def create_chunk(documents, chunk_size = 500, overlap=0):

    text_splitter = CharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap
    )

    chunks = text_splitter.split_documents(documents)
    
    # if chunks:

    #     for i, chunk in enumerate(chunks[:5]):
    #         print(f"\n -- chunk {i+1}--")
    #         print(f"length: {len(chunk.page_content)} characters")
    #         print(f"Content:")
    #         print(chunk.page_content)
    #         print("-"*50)
        
    #     if len(chunks) >5:
    #         print(f"\n .. and {len(chunks)-5} more chunks")


    return chunks

def create_vectorstore(chunks,persist_directory="db/chroma_db"):

    print(f"Creating the Vectorstore at {persist_directory}")

    embedding_model = VoyageAIEmbeddings(model="voyage-4")
    vectorstore =Chroma.from_documents(
        documents=chunks,
        persist_directory=persist_directory,
        embedding=embedding_model,
        collection_metadata={"hnsw:space":"cosine"}
    )

    return vectorstore


persistent_directory = "db/chroma_db"

if os.path.exists(persistent_directory):
    print("vector already exists. no need to create a new vector")
    embedding_model = VoyageAIEmbeddings(model='voyage-4')
    vectorstore = Chroma(
        embedding_function= embedding_model,
        persist_directory=persistent_directory,
        collection_metadata={"hnsw:space":"cosine"}
    )
    print("loading existing vector")


print("Persistent directory does not exist. Initializing vector store ..\n")



docs=load_documents()
chunks=create_chunk(docs)
vectorstore=create_vectorstore(chunks)

