const OpenAI = require('openai');
const DocumentQA = require('../models/DocumentQA');
const StoredDocument = require('../models/StoredDocument');
const Summary = require('../models/Summary');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

const answerWithOpenAI = async (documentText, question) => {
  if (!process.env.OPENAI_API_KEY) {
    return localAnswerFromDoc(documentText, question);
  }
  const maxCtx = 14000;
  const ctx =
    documentText.length > maxCtx
      ? `${documentText.slice(0, maxCtx)}\n\n[Document truncated for length.]`
      : documentText;
  const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content:
          'You answer using ONLY the provided document. If the answer is not supported by the document, say briefly that it is not stated there. Be concise.'
      },
      {
        role: 'user',
        content: `Document:\n${ctx}\n\nQuestion: ${question}\n\nAnswer:`
      }
    ],
    max_tokens: 500
  });
  return response.choices[0].message.content;
};

const assertUserHasDocumentAccess = async (userId, contentHash) => {
  const summary = await Summary.findOne({ userId, contentHash });
  return !!summary;
};

const getFaq = async (req, res) => {
  try {
    const { contentHash } = req.params;
    if (!contentHash) {
      return res.status(400).json({ message: 'contentHash chahiye.' });
    }
    const allowed = await assertUserHasDocumentAccess(req.user.id, contentHash);
    if (!allowed) {
      return res.status(403).json({
        message: 'FAQ dekhne ke liye is document ko pehle summarize karna hoga.'
      });
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
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

const askQuestion = async (req, res) => {
  try {
    const { contentHash, question } = req.body;
    if (!contentHash || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ message: 'contentHash aur question bhejo.' });
    }
    const allowed = await assertUserHasDocumentAccess(req.user.id, contentHash);
    if (!allowed) {
      return res.status(403).json({
        message: 'Sawaal poochhne ke liye is document ko pehle summarize karna hoga.'
      });
    }
    const stored = await StoredDocument.findOne({ contentHash });
    if (!stored) {
      return res.status(404).json({ message: 'Document text nahi mila. Dobara upload karke try karo.' });
    }

    const qDisplay = question.trim();
    const qKey = normalizeQuestionKey(qDisplay);
    if (!qKey) {
      return res.status(400).json({ message: 'Question sahi se likho.' });
    }

    let answer;
    let fallback = false;
    try {
      answer = await answerWithOpenAI(stored.extractedText, qDisplay);
    } catch (err) {
      const status = err.status || err.statusCode;
      if (status === 429 || status === 401) {
        answer = localAnswerFromDoc(stored.extractedText, qDisplay);
        fallback = true;
      } else {
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
      message: fallback ? 'Jawaab offline document lookup se diya gaya.' : 'Jawaab tayyar hai.',
      question: qDisplay,
      answer,
      fallback
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

module.exports = { getFaq, askQuestion };
