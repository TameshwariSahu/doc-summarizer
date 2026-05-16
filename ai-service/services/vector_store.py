# import chromadb
# from config import CHROMA_PATH
# from services.embeddings import get_embedding, get_embeddings_batch

# chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# def get_or_create_collection(collection_name: str):
#     return chroma_client.get_or_create_collection(
#         name=collection_name,
#         metadata={"hnsw:space": "cosine"}
#     )

# def store_chunks(content_hash: str, chunks: list[str]):
#     collection = get_or_create_collection(f"doc_{content_hash[:20]}")
    
#     # Already stored hai toh skip karo
#     existing = collection.count()
#     if existing > 0:
#         return {"stored": False, "message": "Already exists"}

#     embeddings = get_embeddings_batch(chunks)

#     collection.add(
#         documents=chunks,
#         embeddings=embeddings,
#         ids=[f"chunk_{i}" for i in range(len(chunks))]
#     )

#     return {"stored": True, "chunks": len(chunks)}

# def search_similar_chunks(content_hash: str, query: str, top_k: int = 5) -> list[str]:
#     try:
#         collection = get_or_create_collection(f"doc_{content_hash[:20]}")
#         query_embedding = get_embedding(query)

#         results = collection.query(
#             query_embeddings=[query_embedding],
#             n_results=min(top_k, collection.count())
#         )

#         return results["documents"][0] if results["documents"] else []
#     except Exception:
#         return []


import chromadb
from config import CHROMA_PATH

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

def get_or_create_collection(collection_name: str):
    return chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

def store_chunks(content_hash: str, chunks: list):
    collection = get_or_create_collection(f"doc_{content_hash[:20]}")
    
    existing = collection.count()
    if existing > 0:
        return {"stored": False, "message": "Already exists"}

    collection.add(
        documents=chunks,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )

    return {"stored": True, "chunks": len(chunks)}

def search_similar_chunks(content_hash: str, query: str, top_k: int = 5) -> list:
    try:
        collection = get_or_create_collection(f"doc_{content_hash[:20]}")

        results = collection.query(
            query_texts=[query],
            n_results=min(top_k, collection.count())
        )

        return results["documents"][0] if results["documents"] else []
    except Exception:
        return []