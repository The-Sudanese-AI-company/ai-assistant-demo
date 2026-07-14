import os
#import classes to load read files and documnets
from langchain_community.document_loaders import TextLoader, DirectoryLoader
# import classes to chunk the tokens
from langchain_text_splitters import CharacterTextSplitter,MarkdownHeaderTextSplitter,MarkdownTextSplitter
#import the embedding model
from langchain_voyageai import VoyageAIEmbeddings
#import the chroma class to save our embeddings
from langchain_chroma import Chroma
#use env to load sensetive data like api keys
from dotenv import load_dotenv

load_dotenv()
voyage_api_key = os.environ.get('VOYAGE_API_KEY')

def load_documents(docs_path="docs"):
    """ Load all the documents from the documents directory
    """
    print(f"Loading documents from {docs_path}")

    #chek if the path exists
    if not os.path.exists(docs_path):
        raise FileNotFoundError(f"The directory you {docs_path} does not exist. try again and double check if the you selected the correct path.")

    #now we load all the files
    loader = DirectoryLoader(
        path = docs_path,
        glob = "*.md",
        loader_cls = TextLoader,
        loader_kwargs={"encoding": "utf-8", "autodetect_encoding": True},
    )
    documents = loader.load()

    if len(documents) ==0:
        raise FileNotFoundError(f"There are no .txt files in the directory {docs_path}")
    
    # for item_num,doc in enumerate(documents):
    #     print(f"\nDocument {item_num+1}:")
    #     print(f"Content length: {len(doc.page_content)} characters")

    return documents

def split_documents(documents,chunk_size = 800, chunk_overlap = 0):
    """
    split the documents into chunks
    """
    print("splitting documents into chunks...")

    text_splitter = CharacterTextSplitter(
        chunk_size = chunk_size,
        chunk_overlap = chunk_overlap
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

def create_vector_store(chunks,persist_directory="db/chroma_db"):
    """Create and persist ChromaDB vector store"""
    
    print("Creating embeddings and storing in ChromaDB...")

    embedding_model =VoyageAIEmbeddings(model = 'voyage-4')

    #create the ChromaDB vector store
    print("--- Creating vector store ---")
    vectorstore = Chroma.from_documents(
        documents = chunks,
        embedding = embedding_model,
        persist_directory = persist_directory ,
        collection_metadata = {"hnsw:space": "cosine"}

    )
    print("--- Finished creating vector store ---")

    print(f"Vector store created and saved to {persist_directory}")

    return vectorstore

def main():
    print("Main function")

    docs_path = "docs"
    persistent_directory  = "db/chroma_db"

    if  os.path.exists(persistent_directory ):
        print("Vector store already exists. no need to pre-process documents")

        embedding_model = VoyageAIEmbeddings(model = "voyage-4")
        vectorstore = Chroma(
            persist_directory = persistent_directory,
            embedding_function = embedding_model,
            collection_metadata = {"hnsw:space":"cosine"}
        )
        print(f"Loaded existing vector store with {vectorstore._collection.count()} documents")

        return vectorstore

    print("Persistent directory does not exist. Initializing vector store ..\n")

    #1 we gonna load the data
    documents = load_documents(docs_path)
    #2 chunk and split the files
    chunks= split_documents(documents)
    #3 get the embeddings
    vectorstore = create_vector_store(chunks,persistent_directory)
    
    print(f"the data has been saved in the directory {persistent_directory}")
    return vectorstore

if __name__ == "__main__":
    main()