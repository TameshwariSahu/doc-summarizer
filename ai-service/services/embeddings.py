# from openai import OpenAI
# from config import OPENAI_API_KEY

# client = OpenAI(api_key=OPENAI_API_KEY)

# def get_embedding(text: str) -> list[float]:
#     response = client.embeddings.create(
#         model="text-embedding-3-small",
#         input=text
#     )
#     return response.data[0].embedding

# def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
#     response = client.embeddings.create(
#         model="text-embedding-3-small",
#         input=texts
#     )
#     return [item.embedding for item in response.data]

from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> list:
    return model.encode(text).tolist()

def get_embeddings_batch(texts: list) -> list:
    return model.encode(texts).tolist()