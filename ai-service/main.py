from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.chunker import chunk_text
from services.vector_store import store_chunks, search_similar_chunks
from services.memory import add_memory, get_memories, search_memory
from openai import OpenAI
from config import OPENAI_API_KEY

app = FastAPI()
client = OpenAI(api_key=OPENAI_API_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class StoreRequest(BaseModel):
    content_hash: str
    text: str

class QueryRequest(BaseModel):
    content_hash: str
    question: str
    user_id: str

class MemoryRequest(BaseModel):
    user_id: str
    content: str

# Health check
@app.get("/")
def read_root():
    return {"message": "AI Service running!"}

# Store document chunks + embeddings
@app.post("/store")
def store_document(req: StoreRequest):
    try:
        chunks = chunk_text(req.text)
        result = store_chunks(req.content_hash, chunks)
        return {"success": True, "chunks": len(chunks), **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Q&A — relevant chunks nikalo + AI se answer lo
@app.post("/qa")
def question_answer(req: QueryRequest):
    try:
        # Memory se user context lo
        memories = search_memory(req.user_id, req.question)
        memory_context = "\n".join(memories) if memories else ""

        # Vector DB se relevant chunks nikalo
        relevant_chunks = search_similar_chunks(req.content_hash, req.question)

        if not relevant_chunks:
            raise HTTPException(status_code=404, detail="Document not found. Please summarize first.")

        context = "\n\n".join(relevant_chunks)

        # Prompt banao
        system_prompt = "You are an expert document analyst. Answer questions based only on the provided document context. Be accurate and concise."

        user_prompt = f"""Document Context:
{context}

{f"User Preferences: {memory_context}" if memory_context else ""}

Question: {req.question}

Answer based on the document context only."""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )

        answer = response.choices[0].message.content

        # Memory mein save karo
        add_memory(req.user_id, f"Q: {req.question} A: {answer}")

        return {"success": True, "answer": answer, "chunks_used": len(relevant_chunks)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Memory endpoints
@app.post("/memory/add")
def add_user_memory(req: MemoryRequest):
    try:
        add_memory(req.user_id, req.content)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/memory/{user_id}")
def get_user_memories(user_id: str):
    try:
        memories = get_memories(user_id)
        return {"success": True, "memories": memories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))