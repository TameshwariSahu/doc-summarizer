import os

_simple_memory = {}

def add_memory(user_id: str, content: str):
    if user_id not in _simple_memory:
        _simple_memory[user_id] = []
    _simple_memory[user_id].append(content)

def get_memories(user_id: str) -> list:
    return _simple_memory.get(user_id, [])

def search_memory(user_id: str, query: str) -> list:
    memories = _simple_memory.get(user_id, [])
    query_lower = query.lower()
    return [m for m in memories if query_lower in m.lower()]