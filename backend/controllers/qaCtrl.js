const OpenAI = require('openai');
const DocumentQA = require('../models/DocumentQA');
const StoredDocument = require('../models/StoredDocument');
const Summary = require('../models/Summary');
const AppError = require('../utils/AppError');

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});
const normalizeQuestionKey = (q) =>
  q
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const localAnswerFromDoc = (documentText, question) => {
  const qWords = question
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\w\u0900-\u097F]/g, ''))
    .filter((w) => w.length > 2);
  if (!qWords.length) {
    return 'Please ask a more specific question so we can search the document.';
  }
  const sentences = documentText.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  const scored = sentences
    .map((s) => ({
      s,
      score: qWords.filter((w) => s.toLowerCase().includes(w)).length
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3).map((x) => x.s);
  if (!top.length) {
    return 'No clear match in the document for that question. Try different keywords or rephrase.';
  }
  return `From the document (offline lookup): ${top.join(' ')}`;
};

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const answerWithRAG = async (contentHash, question, userId) => {
  try {
    const response = await axios.post(`${AI_SERVICE_URL}/qa`, {
      content_hash: contentHash,
      question: question,
      user_id: userId
    });
    return { answer: response.data.answer, fallback: false };
  } catch (err) {
    return null;
  }
};

const assertUserHasDocumentAccess = async (userId, contentHash) => {
  const summary = await Summary.findOne({ userId, contentHash });
  return !!summary;
};

const getFaq = async (req, res, next) => {
  try {
    const { contentHash } = req.params;
    if (!contentHash) {
      return next(new AppError(400, 'contentHash chahiye.'));
    }
    const allowed = await assertUserHasDocumentAccess(req.user.id, contentHash);
    if (!allowed) {
      return next(
        new AppError(403, 'FAQ dekhne ke liye is document ko pehle summarize karna hoga.')
      );
    }
    const faq = await DocumentQA.aggregate([
      { $match: { contentHash } },
      {
        $group: {
          _id: '$questionNormalized',
          askCount: { $sum: 1 },
          questionDisplay: { $first: '$questionDisplay' },
          answer: { $last: '$answer' },
          lastAsked: { $max: '$createdAt' }
        }
      },
      { $sort: { askCount: -1, lastAsked: -1 } },
      { $limit: 40 }
    ]);
    res.json(
      faq.map((row) => ({
        question: row.questionDisplay,
        answer: row.answer,
        askCount: row.askCount
      }))
    );
  } catch (err) {
    next(err);
  }
};

const askQuestion = async (req, res, next) => {
  try {
    const { contentHash, question } = req.body;
    if (!contentHash || typeof question !== 'string' || !question.trim()) {
      return next(new AppError(400, 'contentHash and question are required.'));
    }

    const allowed = await assertUserHasDocumentAccess(req.user.id, contentHash);
    if (!allowed) {
      return next(new AppError(403, 'Please summarize this document first.'));
    }

    const stored = await StoredDocument.findOne({ contentHash });
    if (!stored) {
      return next(new AppError(404, 'Document not found. Please re-upload.'));
    }

    const qDisplay = question.trim();
    const qKey = normalizeQuestionKey(qDisplay);
    if (!qKey) {
      return next(new AppError(400, 'Please write a valid question.'));
    }

    let answer;
    let fallback = false;

    // Pehle RAG try karo — Vector DB se
    const ragResult = await answerWithRAG(contentHash, qDisplay, req.user.id);

    if (ragResult) {
      answer = ragResult.answer;
    } else {
      // Fallback — direct document text se
      try {
        const maxCtx = 14000;
        const ctx = stored.extractedText.length > maxCtx
          ? `${stored.extractedText.slice(0, maxCtx)}\n\n[Document truncated.]`
          : stored.extractedText;

        const response = await openai.chat.completions.create({
           model: 'llama3-8b-8192',
          messages: [
            {
              role: 'system',
              content: 'Answer using ONLY the provided document. Be concise and accurate.'
            },
            {
              role: 'user',
              content: `Document:\n${ctx}\n\nQuestion: ${qDisplay}\n\nAnswer:`
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        });

        answer = response.choices[0].message.content;
      } catch (err) {
        answer = localAnswerFromDoc(stored.extractedText, qDisplay);
        fallback = true;
      }
    }

    await DocumentQA.create({
      contentHash,
      questionNormalized: qKey,
      questionDisplay: qDisplay,
      answer,
      userId: req.user.id
    });

    res.json({
      message: fallback ? 'Answer from offline lookup.' : 'Answer ready!',
      question: qDisplay,
      answer,
      fallback
    });

  } catch (err) {
    next(err);
  }
};

module.exports = { getFaq, askQuestion };
