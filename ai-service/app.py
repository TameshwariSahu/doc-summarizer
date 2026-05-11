from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
sys.path.insert(0, './services')

from config import OPENAI_API_KEY
from chunker import chunk_text
from embeddings import get_embedding
from vector_store import store_chunks, search_similar_chunks
from memory import add_memory, get_memories, search_memory
from openai import OpenAI

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key=OPENAI_API_KEY)

# ==================== SUMMARIZE ENDPOINT ====================
@app.route('/api/summarize', methods=['POST'])
def summarize():
    try:
        data = request.json
        text = data.get('text', '').strip()
        format_type = data.get('format', 'bullets')
        content_hash = data.get('content_hash', '')
        user_id = data.get('user_id', '')

        if not text:
            return jsonify({'error': 'Text required'}), 400

        # Store document chunks in vector DB
        chunks = chunk_text(text)
        store_chunks(content_hash, chunks)

        # Add to memory for context
        if user_id:
            add_memory(user_id, f"Summarized document: {text[:500]}")

        # Build prompt
        prompts = {
            'bullets': f"Summarize in 5-7 bullet points:\n\n{text}",
            'paragraph': f"Summarize in 2-3 paragraphs:\n\n{text}",
            'json': f"""Return only JSON:
{{"title": "...", "summary": "...", "key_points": [...], "action_items": [...]}}

Document: {text}"""
        }

        prompt = prompts.get(format_type, prompts['bullets'])

        # Call OpenAI
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an expert document summarizer."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.3
        )

        summary = response.choices[0].message.content

        return jsonify({
            'success': True,
            'summary': summary,
            'chunks_stored': len(chunks)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== Q&A ENDPOINT ====================
@app.route('/api/qa/ask', methods=['POST'])
def ask_question():
    try:
        data = request.json
        content_hash = data.get('content_hash', '')
        question = data.get('question', '').strip()
        user_id = data.get('user_id', '')

        if not question or not content_hash:
            return jsonify({'error': 'Question and content_hash required'}), 400

        # Search relevant chunks
        relevant_chunks = search_similar_chunks(content_hash, question, top_k=5)

        # Add question to memory
        if user_id:
            add_memory(user_id, f"Asked: {question}")

        # If no chunks found, use fallback
        if not relevant_chunks:
            context = "No document context available."
        else:
            context = "\n".join(relevant_chunks)

        # Call OpenAI with context
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "Answer ONLY using provided document. Be concise."},
                {"role": "user", "content": f"Document:\n{context}\n\nQuestion: {question}"}
            ],
            max_tokens=500,
            temperature=0.3
        )

        answer = response.choices[0].message.content

        return jsonify({
            'success': True,
            'question': question,
            'answer': answer,
            'used_chunks': len(relevant_chunks)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== GET FAQ ENDPOINT ====================
@app.route('/api/qa/faq/<content_hash>', methods=['GET'])
def get_faq(content_hash):
    try:
        user_id = request.args.get('user_id', '')
        
        if not user_id:
            return jsonify({'error': 'user_id required'}), 400

        # Get all memories for this user
        memories = get_memories(user_id)

        return jsonify({
            'success': True,
            'faq': memories,
            'total': len(memories)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ==================== HEALTH CHECK ====================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'AI service running ✅'}), 200


if __name__ == '__main__':

    app.run(port=5001, debug=True)

