from mem0 import Memory
from config import OPENAI_API_KEY

config = {
    "llm": {
        "provider": "openai",
        "config": {
            "model": "gpt-3.5-turbo",
            "api_key": OPENAI_API_KEY
        }
    },
    "embedder": {
        "provider": "openai",
        "config": {
            "model": "text-embedding-3-small",
            "api_key": OPENAI_API_KEY
        }
    }
}

memory = Memory.from_config(config)

def add_memory(user_id: str, content: str):
    memory.add(content, user_id=user_id)

def get_memories(user_id: str) -> list:
    results = memory.get_all(user_id=user_id)
    return [m["memory"] for m in results] if results else []

def search_memory(user_id: str, query: str) -> list:
    results = memory.search(query, user_id=user_id)
    return [m["memory"] for m in results] if results else []